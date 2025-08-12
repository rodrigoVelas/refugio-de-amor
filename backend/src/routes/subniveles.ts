import { Router } from 'express'
import { pool } from '../core/db'
const r = Router()

r.get('/subniveles', async (_req:any, res:any)=>{
  const q = `select s.id, s.nombre, s.dias, s.horario, n.nombre as nivel_nombre from subniveles s join niveles n on n.id=s.nivel_id order by n.nombre, s.nombre`
  const { rows } = await pool.query(q)
  rows.forEach((x:any)=>{ if (typeof x.dias === 'string') { try{ x.dias = JSON.parse(x.dias) }catch{} } })
  res.json(rows)
})

r.post('/subniveles', async (req:any, res:any)=>{
  const { nivel_id, nombre, dias, horario } = req.body
  const { rows } = await pool.query('insert into subniveles (nivel_id, nombre, dias, horario) values ($1,$2,$3,$4) returning *',
    [nivel_id, nombre, JSON.stringify(dias||[]), horario||null])
  res.json(rows[0])
})

r.put('/subniveles/:id', async (req:any, res:any)=>{
  const { id } = req.params; const { nombre, dias, horario } = req.body
  const { rows } = await pool.query('update subniveles set nombre=coalesce($1,nombre), dias=coalesce($2,dias), horario=coalesce($3,horario), modificado_en=now() where id=$4 returning *',
    [nombre, dias?JSON.stringify(dias):null, horario, id])
  res.json(rows[0])
})

r.delete('/subniveles/:id', async (req:any, res:any)=>{
  const { id } = req.params
  await pool.query('delete from subniveles where id=$1',[id])
  res.json({ ok:true })
})

export default r
