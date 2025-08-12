import { Router } from 'express'
import { pool } from '../core/db'
const r = Router()

r.get('/perfil', async (req:any, res:any)=>{
  const userId = req.user.id
  const { rows } = await pool.query('select id, email, nombres, apellidos, telefono, avatar_url from usuarios where id=$1',[userId])
  res.json(rows[0])
})

r.put('/perfil', async (req:any, res:any)=>{
  const userId = req.user.id
  const { nombres, apellidos, telefono, avatar_url } = req.body
  await pool.query('update usuarios set nombres=$1, apellidos=$2, telefono=$3, avatar_url=$4, modificado_en=now(), modificado_por=$5 where id=$6',
    [nombres?.trim(), apellidos?.trim(), telefono?.trim()||null, avatar_url||null, userId, userId])
  res.json({ ok:true })
})
export default r
