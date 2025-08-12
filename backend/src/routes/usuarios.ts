import { Router } from 'express'
import { pool } from '../core/db'
import bcrypt from 'bcryptjs'
const r = Router()

r.get('/usuarios', async (_req:any, res:any)=>{
  const q = `
    select u.id, u.email, u.nombres, u.apellidos,
      array(select r.nombre from usuarios_roles ur join roles r on r.id=ur.role_id where ur.usuario_id=u.id) as roles
    from usuarios u
    order by u.email
  `
  const { rows } = await pool.query(q)
  res.json(rows)
})

r.post('/usuarios', async (req:any, res:any)=>{
  const { email, nombres, apellidos, password, role } = req.body
  const pass = await bcrypt.hash(password || 'demo123', 10)
  const u = await pool.query('insert into usuarios (email, password_hash, nombres, apellidos) values ($1,$2,$3,$4) returning *', [email, pass, nombres, apellidos])
  if (role){ await pool.query('insert into usuarios_roles (usuario_id, role_id) select $1, r.id from roles r where r.nombre=$2 on conflict do nothing', [u.rows[0].id, role]) }
  res.json(u.rows[0])
})

r.put('/usuarios/:id', async (req:any, res:any)=>{
  const { id } = req.params
  const { email, nombres, apellidos, password, role } = req.body
  if (password){ const pass = await bcrypt.hash(password, 10); await pool.query('update usuarios set password_hash=$1 where id=$2', [pass, id]) }
  await pool.query('update usuarios set email=coalesce($1,email), nombres=coalesce($2,nombres), apellidos=coalesce($3,apellidos), modificado_en=now() where id=$4', [email, nombres, apellidos, id])
  if (role){ await pool.query('delete from usuarios_roles where usuario_id=$1', [id]); await pool.query('insert into usuarios_roles (usuario_id, role_id) select $1, r.id from roles r where r.nombre=$2 on conflict do nothing', [id, role]) }
  const { rows } = await pool.query('select id, email, nombres, apellidos from usuarios where id=$1', [id])
  res.json(rows[0])
})

r.delete('/usuarios/:id', async (req:any, res:any)=>{
  const { id } = req.params
  await pool.query('delete from usuarios_roles where usuario_id=$1',[id])
  await pool.query('delete from usuarios where id=$1', [id])
  res.json({ ok:true })
})

export default r
