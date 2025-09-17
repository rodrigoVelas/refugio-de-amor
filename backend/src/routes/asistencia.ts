import { Router } from 'express'
import { pool } from '../core/db'
import { getUserPerms } from '../core/rbac'
import { randomUUID } from 'crypto'

const r = Router()

// ping para verificar que el router esta montado
r.get('/asistencia/ping', (_req, res) => res.json({ ok: true }))

/**
 * lista sesiones agrupadas por sesion_id
 * no usamos agregados sobre uuid
 */
r.get('/asistencia', async (req: any, res: any) => {
  const userId = req.user.id
  const perms = await getUserPerms(userId)
  const verTodas = perms.includes('asistencia_ver_todas')

  const sql = verTodas
    ? `
      select
        sesion_id as id,
        max(fecha) as fecha,
        max(hora)  as hora,
        count(*) filter (where estado = 'presente')::int as presentes
      from asistencia
      group by sesion_id
      order by fecha desc nulls last, hora desc nulls last
      limit 500
    `
    : `
      select
        sesion_id as id,
        max(fecha) as fecha,
        max(hora)  as hora,
        count(*) filter (where estado = 'presente')::int as presentes
      from asistencia
      where maestro_id = $1
      group by sesion_id
      order by fecha desc nulls last, hora desc nulls last
      limit 500
    `
  const params: any[] = verTodas ? [] : [userId]
  const { rows } = await pool.query(sql, params)
  res.json(rows)
})

/**
 * crear sesion (devuelve id, fecha, hora)
 */
r.post('/asistencia', async (req: any, res: any) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).send('no auth')

  const perms = await getUserPerms(userId)
  if (!perms.includes('asistencia_crear')) return res.status(403).send('no autorizado')

  const { fecha, hora } = req.body || {}
  if (!fecha || !hora) return res.status(400).send('fecha y hora requeridas')

  const sesionId = randomUUID()
  return res.json({ id: sesionId, fecha, hora })
})

/**
 * cargar para editar: ninos del maestro + detalles existentes
 */
r.get('/asistencia/:id/editar', async (req: any, res: any) => {
  const userId = req.user.id
  const sesionId = req.params.id

  // ninos asignados al maestro
  const ninos = await pool.query(
    `select id, codigo, nombres, apellidos
       from ninos
      where maestro_id = $1
      order by apellidos, nombres`,
    [userId]
  )

  // marcas existentes de la sesion
  const det = await pool.query(
    `select nino_id, estado, coalesce(nota,'') as nota,
            max(fecha) as fecha, max(hora) as hora
       from asistencia
      where sesion_id = $1 and maestro_id = $2
      group by nino_id, estado, nota`,
    [sesionId, userId]
  )

  const fecha = det.rows[0]?.fecha || null
  const hora  = det.rows[0]?.hora  || null

  res.json({ sesion: { id: sesionId, fecha, hora }, ninos: ninos.rows, detalles: det.rows })
})

/**
 * guardar detalles (upsert por sesion_id + nino_id)
 * sin subnivel_id
 */
r.post('/asistencia/:id/detalles', async (req: any, res: any) => {
  const userId = req.user.id
  const sesionId = req.params.id
  const items = Array.isArray(req.body?.items) ? req.body.items : []
  const fecha = (req.body?.fecha || new Date().toISOString().slice(0,10)) // yyyy-mm-dd
  const hora  = (req.body?.hora  || new Date().toISOString().slice(11,16)) // HH:MM

  if (!items.length) return res.json({ ok: true, count: 0 })

  // validar que los ninos pertenecen al maestro
  const ids = items.map((it: any) => it.nino_id)
  const owns = await pool.query(
    `select id from ninos where maestro_id = $1 and id = any($2::uuid[])`,
    [userId, ids]
  )
  const setOwn = new Set(owns.rows.map((r: any) => r.id))
  const valid = items.filter((it: any) => setOwn.has(it.nino_id))
  if (!valid.length) return res.json({ ok: true, count: 0 })

  const q = `
    insert into asistencia (sesion_id, maestro_id, fecha, hora, estado, nino_id, nota, creado_en, modificado_en)
    values ($1, $2, $3, $4, $5, $6, $7, now(), now())
    on conflict (sesion_id, nino_id)
    do update set estado = excluded.estado, nota = excluded.nota, modificado_en = now()
  `

  for (const it of valid) {
    const estado = String(it.estado || '').toLowerCase().trim()
    if (!['presente','ausente','suplente'].includes(estado)) continue
    await pool.query(q, [sesionId, userId, fecha, hora, estado, it.nino_id, it.nota || null])
  }

  res.json({ ok: true, count: valid.length })
})

export default r
