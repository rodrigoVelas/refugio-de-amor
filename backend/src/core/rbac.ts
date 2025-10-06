import { pool } from './db'

export async function getUserPerms(userId: string): Promise<string[]> {
  try {
    const { rows } = await pool.query(`
      select distinct p.clave
      from usuarios u
      join usuarios_roles ur on ur.usuario_id = u.id
      join roles_permisos rp on rp.role_id = ur.role_id
      join permisos p on p.id = rp.permiso_id
      where u.id = $1
    `, [userId])
    
   //console.log(`Permisos para usuario ${userId}:`, rows.map(r => r.clave))
    
    return rows.map(r => r.clave as string)
  } catch (error) {
    console.error('Error obteniendo permisos:', error)
    return []
  }
}