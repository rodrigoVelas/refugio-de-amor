import { pool } from '../core/db'
import bcrypt from 'bcryptjs'

async function run(){
  for (const r of ['directora','contabilidad','colaboradores']){
    await pool.query(`insert into roles (nombre) values ($1) on conflict do nothing`, [r])
  }
  const perms = ['ver_perfil','editar_perfil_propio','ver_niveles','crud_niveles','crud_subniveles','asignar_colaboradores','tomar_asistencia','ver_asistencia','ver_ninos','crud_ninos','ver_registro_medico','subir_registro_medico','ver_reportes','exportar_reportes','ver_usuarios','crud_usuarios','ver_roles','crud_roles']
  for (const p of perms){ await pool.query(`insert into permisos (clave) values ($1) on conflict do nothing`, [p]) }
  // roles con codigo fijo
await pool.query(`insert into roles (nombre, codigo) values ('directora',1)
  on conflict (nombre) do update set codigo=excluded.codigo`);
await pool.query(`insert into roles (nombre, codigo) values ('contabilidad',2)
  on conflict (nombre) do update set codigo=excluded.codigo`);
await pool.query(`insert into roles (nombre, codigo) values ('colaboradores',3)
  on conflict (nombre) do update set codigo=excluded.codigo`);

  const pass = await bcrypt.hash('demo123', 10)
  const users = [
    { email:'directora@refugio.local', nombres:'directora', apellidos:'general', role:'directora' },
    { email:'contabilidad@refugio.local', nombres:'contabilidad', apellidos:'central', role:'contabilidad' },
    { email:'colaborador@refugio.local', nombres:'colaborador', apellidos:'uno', role:'colaboradores' }
  ]
  for (const u of users){
    const ins = await pool.query(`insert into usuarios (email, password_hash, nombres, apellidos) values ($1,$2,$3,$4) on conflict (email) do update set password_hash=excluded.password_hash returning id`,[u.email, pass, u.nombres, u.apellidos])
    await pool.query(`insert into usuarios_roles (usuario_id, role_id) select $1, r.id from roles r where r.nombre=$2 on conflict do nothing`,[ins.rows[0].id, u.role])
  }
  console.log('seed listo'); process.exit(0)
}
run().catch(e=>{ console.error(e); process.exit(1) })
