// backend/src/core/perm_middleware.ts
import { Response, NextFunction } from 'express'
import { getUserPerms } from './rbac'

export function requirePerms(perms: string[]) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: 'No autenticado' })
      }

      const userPerms = await getUserPerms(userId)
      
      // Si el usuario tiene alguno de los permisos requeridos, permitir
      const hasPermission = perms.some(p => userPerms.includes(p))
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'No autorizado' })
      }

      // Guardar permisos en req para uso posterior
      req.userPerms = userPerms
      
      next()
    } catch (error) {
      console.error('[requirePerms] Error:', error)
      res.status(500).json({ error: 'Error verificando permisos' })
    }
  }
}