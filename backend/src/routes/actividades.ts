import { Router } from 'express'
import { pool } from '../core/db'
import { getUserPerms } from '../core/rbac'

const r = Router()

// listar actividades por rango (mes visible)
// GET /actividades?from=YYYY-MM-DD&to=YYYY-MM-DD
r.get('/actividades', async (req:any, res:any)=>{
  const { from, to } = req.query;
  // valida rango
  if(!from || !to) return res.status(400).send('from y to requeridos');

  const q = `
    select
      id,
      to_char(fecha,'YYYY-MM-DD') as fecha,
      to_char(hora,'HH24:MI')    as hora,
      titulo,
      coalesce(descripcion,'')   as descripcion,
      estado
    from actividades
    where fecha between $1::date and $2::date
    order by fecha asc, hora asc nulls last, titulo asc
  `;
  const { rows } = await pool.query(q, [from, to]);
  res.json(rows);
});


// crear (solo directora con actividades_admin)
r.post('/actividades', async (req: any, res) => {
  const userId = req.user.id
  const perms = await getUserPerms(userId)
  if (!perms.includes('actividades_admin')) return res.status(403).send('no autorizado')

  const b = req.body || {}
  const fecha = b.fecha
  const titulo = (b.titulo || '').toString().trim()
  const hora = b.hora || null
  const descripcion = (b.descripcion || '').toString().trim()
  if (!fecha || !titulo) return res.status(400).send('fecha y titulo requeridos')

  const { rows } = await pool.query(
    `insert into actividades (fecha, hora, titulo, descripcion, creado_por)
     values ($1,$2,$3,$4,$5)
     returning id, fecha, hora, titulo, descripcion, estado, creado_por, creado_en, modificado_en`,
    [fecha, hora, titulo, descripcion, userId]
  )
  res.json(rows[0])
})

// actualizar (solo directora)
r.put('/actividades/:id', async (req: any, res) => {
  const userId = req.user.id
  const perms = await getUserPerms(userId)
  if (!perms.includes('actividades_admin')) return res.status(403).send('no autorizado')

  const { id } = req.params
  const b = req.body || {}
  const fecha = b.fecha
  const titulo = (b.titulo || '').toString().trim()
  const hora = b.hora || null
  const descripcion = (b.descripcion || '').toString().trim()
  const estado = (b.estado || 'pendiente').toString().trim()
  if (!fecha || !titulo) return res.status(400).send('fecha y titulo requeridos')
  if (!['pendiente','completada'].includes(estado)) return res.status(400).send('estado invalido')

  const { rows } = await pool.query(
    `update actividades set
      fecha = $1, hora = $2, titulo = $3, descripcion = $4, estado = $5, modificado_en = now()
     where id = $6
     returning id, fecha, hora, titulo, descripcion, estado, creado_por, creado_en, modificado_en`,
    [fecha, hora, titulo, descripcion, estado, id]
  )
  if (!rows[0]) return res.status(404).send('no encontrado')
  res.json(rows[0])
})

// eliminar (solo directora)
r.delete('/actividades/:id', async (req: any, res) => {
  const userId = req.user.id
  const perms = await getUserPerms(userId)
  if (!perms.includes('actividades_admin')) return res.status(403).send('no autorizado')

  const { id } = req.params
  await pool.query('delete from actividades where id=$1', [id])
  res.json({ ok: true })
})

export default r
