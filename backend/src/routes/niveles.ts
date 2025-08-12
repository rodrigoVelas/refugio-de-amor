import { Router } from 'express'
import { pool } from '../core/db'
const r = Router()

r.get('/niveles', async (_req:any, res:any)=>{
  const { rows } = await pool.query('select id, nombre, descripcion from niveles order by nombre')
  res.json(rows)
})

r.post('/niveles', async (req:any, res:any)=>{
  const { nombre, descripcion } = req.body
  const { rows } = await pool.query('insert into niveles (nombre, descripcion) values ($1,$2) returning *', [nombre, descripcion||null])
  res.json(rows[0])
})

r.put('/niveles/:id', async (req:any, res:any)=>{
  const { id } = req.params; const { nombre, descripcion } = req.body
  const { rows } = await pool.query('update niveles set nombre=coalesce($1,nombre), descripcion=$2, modificado_en=now() where id=$3 returning *', [nombre, descripcion||null, id])
  res.json(rows[0])
})

r.delete('/niveles/:id', async (req:any, res:any)=>{
  const { id } = req.params
  await pool.query('delete from niveles where id=$1',[id])
  res.json({ ok:true })
})

export default r
