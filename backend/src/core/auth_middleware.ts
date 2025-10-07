import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = (process.env.JWT_SECRET || process.env.jwt_secret || '').toString()

export async function authMiddleware(req: any, res: Response, next: NextFunction) {
 // console.log('🔒 authMiddleware - Ruta:', req.method, req.path)
  
  try {
    const token = req.cookies?.token
    
    if (!token) {
      console.log('🔒 authMiddleware - NO HAY TOKEN, rechazando')
      return res.status(401).json({ error: 'No autenticado' })
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any
    req.user = { 
      id: decoded.id, 
      email: decoded.email, 
      rol: decoded.rol 
    }
    
   // console.log('🔒 authMiddleware - Usuario OK:', req.user.email, '- Ruta:', req.path)
    
    next()
  } catch (error) {
    console.error('🔒 authMiddleware - ERROR:', error)
    return res.status(401).json({ error: 'Token inválido' })
  }
}