import { Router } from 'express'
import { pool } from '../core/db'
import { getUserPerms } from '../core/rbac'
import { randomUUID } from 'crypto'

const r = Router()

// helpers fecha/hora
function pad(n:number){ return String(n).padStart(2,'0') }
function today(){ const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` }
function nowHHMM(){ const d=new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
function isIsoDate(s:any){ return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) }
function normTimeOrNull(s:any){ if(!s||typeof s!=='string') return null; const m=s.match(/^(\d{2}):(\d{2})/); return m?`${m[1]}:${m[2]}`:null }

// ping
r.get('/asistencia/ping', (_req, res)=> res.json({ ok:true }))

/**
 * lista de sesiones agrupadas por sesion_id (solo fecha/hora contables)
 */
r.get('/asistencia', async (req:any, res:any)=>{
  const userId = req.user.id
  const perms = await getUserPerms(userId)
  const verTodas = perms.includes('asistencia_ver_todas')

  const sql = verTodas ? `
    select sesion_id as id,
           max(fecha) as fecha,
           max(hora)  as hora,
           count(*) filter (where estado='presente')::int as presentes
    from asistencia
    group by sesion_id
    order by fecha desc nulls last, hora desc nulls last
    limit 500
  ` : `
    select sesion_id as id,
           max(fecha) as fecha,
           max(hora)  as hora,
           count(*) filter (where estado='presente')::int as presentes
    from asistencia
    where maestro_id = $1
    group by sesion_id
    order by fecha desc nulls last, hora desc nulls last
    limit 500
  `
  const params = verTodas ? [] : [userId]
  const { rows } = await pool.query(sql, params)
  res.json(rows)
})

/**
 * crear sesion: genera sesion_id y regresa {id, fecha, hora} (no inserta filas aun)
 */
r.post('/asistencia', async (req:any, res:any)=>{
  const userId = req.user?.id
  if(!userId) return res.status(401).send('no auth')

  const perms = await getUserPerms(userId)
  if (!perms.includes('asistencia_crear')) return res.status(403).send('no autorizado')

  const bodyFecha = req.body?.fecha
  const bodyHora  = req.body?.hora
  const fecha = isIsoDate(bodyFecha) ? bodyFecha : today()
  const hora  = normTimeOrNull(bodyHora) || nowHHMM()

  const sesionId = randomUUID()
  // no insertamos nada aun; el detalle se guarda en /detalles
  res.json({ id: sesionId, fecha, hora })
})

/**
 * cargar para editar: lista ninos (por maestro) y detalles existentes
 */
r.get('/asistencia/:id/editar', async (req:any, res:any)=>{
  const userId = req.user.id
  const sesionId = req.params.id

  const ninos = await pool.query(
    `select id, codigo, nombres, apellidos
       from ninos
      where maestro_id = $1
      order by apellidos, nombres`, [userId]
  )

  const det = await pool.query(
    `select nino_id, estado, coalesce(nota,'') as nota,
            max(fecha) as fecha, max(hora) as hora
       from asistencia
      where sesion_id = $1 and maestro_id = $2
      group by nino_id, estado, nota`, [sesionId, userId]
  )

  const fecha = det.rows[0]?.fecha || null
  const hora  = det.rows[0]?.hora  || null

  res.json({ sesion:{ id: sesionId, fecha, hora }, ninos: ninos.rows, detalles: det.rows })
})

/**
 * guardar detalles (upsert por sesion_id + nino_id)
 * valida fecha/hora y usa defaults seguros si no vienen.
 */
r.post('/asistencia/:id/detalles', async (req:any, res:any)=>{
  const userId  = req.user.id
  const sesionId = req.params.id

  // normaliza fecha/hora (evita 'undefined'::date / ::time)
  const bodyFecha = req.body?.fecha
  const bodyHora  = req.body?.hora
  const fecha = isIsoDate(bodyFecha) ? bodyFecha : today()
  const hora  = normTimeOrNull(bodyHora) || nowHHMM()

  const items = Array.isArray(req.body?.items) ? req.body.items : []
  if(!items.length) return res.json({ ok:true, count:0 })

  // validar pertenencia de ninos al maestro
  const ids: string[] = items.map((it:any)=> it.nino_id).filter(Boolean)
  if(!ids.length) return res.json({ ok:true, count:0 })

  const owns = await pool.query(
    `select id from ninos where maestro_id = $1 and id = any($2::uuid[])`,
    [userId, ids]
  )
  const setOwn = new Set(owns.rows.map((r:any)=> r.id))
  const valid = items.filter((it:any)=> setOwn.has(it.nino_id))

  // solo estados permitidos
  const allowed = new Set(['presente','ausente','suplente'])

  const sql = `
    insert into asistencia
      (sesion_id, subnivel_id, maestro_id, fecha, hora, estado, nino_id, nota, creado_en, modificado_en)
    values
      ($1, NULL, $2, $3::date, $4::time, $5, $6, $7, now(), now())
    on conflict (sesion_id, nino_id)
    do update set estado = excluded.estado,
                  nota = excluded.nota,
                  fecha = excluded.fecha,
                  hora  = excluded.hora,
                  modificado_en = now()
  `
  let count = 0
  for(const it of valid){
    const estado = String(it.estado||'').toLowerCase()
    if(!allowed.has(estado)) continue
    await pool.query(sql, [sesionId, userId, fecha, hora, estado, it.nino_id, it.nota || null])
    count++
  }

  res.json({ ok:true, count })
})

/** export csv de una sesion (abre en excel) */
r.get('/asistencia/:id/export.csv', async (req:any, res:any)=>{
  const userId  = req.user.id
  const sesionId = req.params.id

  // permisos: directora puede ver todas; maestro solo sus sesiones
  const perms = await getUserPerms(userId)
  const verTodas = perms.includes('asistencia_ver_todas')

  // valida acceso
  if (!verTodas) {
    const chk = await pool.query(
      `select 1 
         from asistencia 
        where sesion_id = $1 and maestro_id = $2
        limit 1`,
      [sesionId, userId]
    )
    if (!chk.rowCount) return res.status(403).send('no autorizado')
  }

  // filas de la sesion
  const q = `
    select 
      to_char(a.fecha,'YYYY-MM-DD') as fecha,
      to_char(a.hora,'HH24:MI')     as hora,
      a.estado,
      coalesce(a.nota,'')           as nota,
      n.codigo,
      n.nombres,
      n.apellidos
    from asistencia a
    join ninos n on n.id = a.nino_id
    where a.sesion_id = $1
    order by n.apellidos, n.nombres
  `
  const { rows } = await pool.query(q, [sesionId])

  // arma csv
  const headers = ['fecha','hora','estado','nota','codigo','nombres','apellidos']
  const escape = (s:any)=>{
    const v = (s===null || s===undefined) ? '' : String(s)
    return /[",\n\r]/.test(v) ? `"${v.replace(/"/g,'""')}"` : v
  }
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))
  ]
  const csv = lines.join('\n')

  res.setHeader('content-type','text/csv; charset=utf-8')
  res.setHeader('content-disposition', `attachment; filename="asistencia_${sesionId}.csv"`)
  res.send(csv)
})

// alias: /asistencia/:id/export -> csv
r.get('/asistencia/:id/export', async (req:any, res:any)=>{
  req.url = `/asistencia/${req.params.id}/export.csv`
  ;(r as any).handle(req, res)
})

r.delete('/asistencia/:id', async (req:any, res:any)=>{
  const userId = req.user.id
  const sesionId = req.params.id
  const perms = await getUserPerms(userId)
  const verTodas = perms.includes('asistencia_ver_todas')

  // si no es directora, verificar que la sesion sea suya
  if(!verTodas){
    const chk = await pool.query(
      `select 1 from asistencia where sesion_id=$1 and maestro_id=$2 limit 1`,
      [sesionId, userId]
    )
    if(!chk.rowCount) return res.status(403).send('no autorizado')
  }

  await pool.query(`delete from asistencia where sesion_id=$1`, [sesionId])
  res.json({ok:true})
})


export default r
