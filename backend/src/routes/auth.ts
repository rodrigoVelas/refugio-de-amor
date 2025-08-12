import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { pool } from '../core/db'
import { getUserPerms } from '../core/rbac'

const r = Router()

r.post('/login', async (req:any, res:any)=>{
  const { email, password } = req.body
  const { rows } = await pool.query('select id, email, password_hash from usuarios where email=$1 limit 1',[email])
  const u = rows[0]
  if (!u) return res.status(401).json({ error:'credenciales invalidas' })
  const ok = await bcrypt.compare(password, u.password_hash)
  if (!ok) return res.status(401).json({ error:'credenciales invalidas' })
  const token = jwt.sign({ id:u.id, email:u.email }, process.env.jwt_secret as string, { expiresIn:'1d' })
  res.cookie('token', token, { httpOnly:true, sameSite:'lax' })
  res.json({ ok:true })
})

r.post('/logout', (req:any, res:any)=>{ res.clearCookie('token'); res.json({ ok:true }) })

r.get('/me', async (req:any, res:any)=>{
  const token = req.cookies?.token
  if (!token) return res.json(null)
  try{
    const data:any = jwt.verify(token, process.env.jwt_secret as string)
    const perms = await getUserPerms(data.id)
    res.json({ id:data.id, email:data.email, perms })
  }catch{ res.json(null) }
})

export default r
