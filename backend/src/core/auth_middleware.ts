import jwt from 'jsonwebtoken'
import { Request, Response, NextFunction } from 'express'
export function authMiddleware(req:any, res:Response, next:NextFunction){
  const token = req.cookies?.token
  if (!token) return res.status(401).json({ error:'no autorizado' })
  try{ const data:any = jwt.verify(token, process.env.jwt_secret as string); req.user = data; next() }
  catch{ return res.status(401).json({ error:'token invalido' }) }
}
