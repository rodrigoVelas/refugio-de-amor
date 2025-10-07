import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'super_secreto'

if (!JWT_SECRET || JWT_SECRET === 'super_secreto') {
  console.warn('⚠️  JWT_SECRET no está configurado correctamente')
}

export async function authMiddleware(req: any, res: Response, next: NextFunction) {
  try {
    const token = req.cookies?.token

    if (!token) {
      console.log('🔒 authMiddleware - NO HAY TOKEN en cookies')
      return res.status(401).json({ error: 'No autenticado' })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    req.user = {
      id: decoded.id,
      email: decoded.email,
      rol: decoded.rol
    }

    console.log('✅ authMiddleware - Usuario autenticado:', req.user.email)
    next()
  } catch (error) {
    console.error('❌ authMiddleware - ERROR:', error)
    return res.status(401).json({ error: 'Token inválido' })
  }
}