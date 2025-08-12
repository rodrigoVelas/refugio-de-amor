import { pool } from './db'
export async function getUserPerms(userId:string): Promise<string[]> {
  const { rows } = await pool.query(`
    select distinct p.clave
    from usuarios u
    join usuarios_roles ur on ur.usuario_id = u.id
    join roles_permisos rp on rp.role_id = ur.role_id
    join permisos p on p.id = rp.permiso_id
    where u.id=$1 and u.activo=true
  `,[userId])
  return rows.map(r=> r.clave as string)
}
