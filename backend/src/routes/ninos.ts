import { Router } from 'express'
import { pool } from '../core/db'
const r = Router()

r.get('/ninos', async (req:any, res:any)=>{
  const q = (req.query.q || '').toString().trim().toLowerCase()
  const sql = `
    select ni.id, ni.nombres, ni.apellidos,
      (select nombre from niveles where id=ni.nivel_id) as nivel,
      (select nombre from subniveles where id=ni.subnivel_id) as subnivel
    from ninos ni
    where ($1='' or lower(ni.nombres) like '%'||$1||'%' or lower(ni.apellidos) like '%'||$1||'%')
    order by ni.apellidos, ni.nombres
  `
  const { rows } = await pool.query(sql, [q])
  res.json(rows)
})

r.post('/ninos', async (req:any, res:any)=>{
  const { nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id } = req.body
  const { rows } = await pool.query(`
    insert into ninos (nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id)
    values ($1,$2,$3,$4,$5,$6) returning *
  `,[nombres, apellidos, fecha_nacimiento, nivel_id||null, subnivel_id||null, maestro_id||null])
  res.json(rows[0])
})

r.put('/ninos/:id', async (req:any, res:any)=>{
  const { id } = req.params
  const { nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id, activo } = req.body
  const { rows } = await pool.query(`
    update ninos set
      nombres=coalesce($1,nombres), apellidos=coalesce($2,apellidos),
      fecha_nacimiento=coalesce($3,fecha_nacimiento),
      nivel_id=coalesce($4,nivel_id), subnivel_id=coalesce($5,subnivel_id),
      maestro_id=coalesce($6,maestro_id), activo=coalesce($7,activo),
      modificado_en=now()
    where id=$8 returning *
  `,[nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id, activo, id])
  res.json(rows[0])
})

r.delete('/ninos/:id', async (req:any, res:any)=>{
  const { id } = req.params
  await pool.query('delete from ninos where id=$1',[id])
  res.json({ ok:true })
})

export default r
