// backend/src/routes/auth.ts
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { pool } from '../core/db'
import { getUserPerms } from '../core/rbac'

const r = Router()
const isProd = process.env.NODE_ENV === 'production'
const JWT_SECRET = (process.env.JWT_SECRET || process.env.jwt_secret || '').toString()

if (!JWT_SECRET) {
  console.warn('[auth] JWT_SECRET no esta definido; configura tu .env')
}

function setAuthCookie(res: any, token: string) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })
}

function clearAuthCookie(res: any) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  })
}

// POST /auth/login
r.post('/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body || {}
    
    console.log('[auth/login] Intento de login:', email)
    
    if (!email || !password) {
      return res.status(400).json({ error: 'datos incompletos' })
    }

    // Query simple sin JOIN - usando la columna rol directamente
    const q = `SELECT id, email, password_hash, nombres, apellidos, rol
               FROM usuarios
               WHERE email = $1
               LIMIT 1`
    
    const { rows } = await pool.query(q, [email])
    const u = rows[0]
    
    if (!u) {
      console.log('[auth/login] Usuario no encontrado:', email)
      return res.status(401).json({ error: 'credenciales invalidas' })
    }

    const ok = await bcrypt.compare(password, u.password_hash)
    
    if (!ok) {
      console.log('[auth/login] Password incorrecta para:', email)
      return res.status(401).json({ error: 'credenciales invalidas' })
    }

    const perms = await getUserPerms(u.id)

    const token = jwt.sign(
      { 
        id: u.id, 
        email: u.email,
        rol: u.rol
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    )

    setAuthCookie(res, token)
    
    console.log('[auth/login] Login exitoso:', email, '- Rol:', u.rol)
    
    let redirectTo = '/dashboard'
    
    switch(u.rol?.toLowerCase()) {
      case 'directora':
        redirectTo = '/directora/dashboard'
        break
      case 'contabilidad':
        redirectTo = '/contabilidad/dashboard'
        break
      case 'colaboradores':
        redirectTo = '/colaboradores/dashboard'
        break
      default:
        redirectTo = '/dashboard'
    }
    
    return res.json({ 
      ok: true,
      success: true,
      user: {
        id: u.id,
        email: u.email,
        nombres: u.nombres,
        apellidos: u.apellidos,
        rol: u.rol,
        name: `${u.nombres} ${u.apellidos || ''}`.trim()
      },
      perms: perms,
      redirectTo: redirectTo
    })
  } catch (err: any) {
    console.error('[auth/login] error:', err)
    return res.status(500).json({ error: 'error interno' })
  }
})

// POST /auth/logout
r.post('/logout', (req: any, res: any) => {
  try {
    clearAuthCookie(res)
    return res.json({ ok: true })
  } catch (err: any) {
    console.error('[auth/logout] error:', err)
    return res.status(500).json({ error: 'error interno' })
  }
})

// GET /auth/me
r.get('/me', async (req: any, res: any) => {
  try {
    const token = req.cookies?.token
    if (!token) return res.json(null)

    const data: any = jwt.verify(token, JWT_SECRET)
    
    const q = `SELECT id, email, nombres, apellidos, rol
               FROM usuarios
               WHERE id = $1
               LIMIT 1`
    
    const { rows } = await pool.query(q, [data.id])
    const user = rows[0]

    if (!user) return res.json(null)

    const perms = await getUserPerms(data.id)

    return res.json({ 
      id: user.id, 
      email: user.email,
      nombres: user.nombres,
      apellidos: user.apellidos,
      rol: user.rol,
      name: `${user.nombres} ${user.apellidos || ''}`.trim(),
      perms: perms
    })
  } catch (err) {
    console.error('[auth/me] error:', err)
    return res.json(null)
  }
})

export default r