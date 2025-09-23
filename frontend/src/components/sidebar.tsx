import { can } from '../lib/permissions'

export default function Sidebar({ user }:{ user:any }){
  const menu = [
    { label:'Inicio', route:'/inicio', perms:['*'] },
    { label:'Mi perfil', route:'/perfil', perms:['ver_perfil'] },

    { label:'Niños', route:'/ninos', perms:['ver_ninos'] },
    { label:'Niveles', route:'/niveles', perms:['ver_niveles'] },
    { label:'Subniveles', route:'/subniveles', perms:['ver_niveles'] },

    { label:'Asistencia', route:'/asistencia', perms:['asistencia_ver_propias','asistencia_ver_todas'] },

    { label:'Facturas', route:'/facturas', perms:['facturas_ver_propias','facturas_ver_todas'] },

    { label:'Usuarios', route:'/admin/usuarios', perms:['ver_usuarios'] },
   // { label:'Roles', route:'/admin/roles', perms:['ver_roles'] },
   { label:'Actividades', route:'/actividades', perms:['actividades_ver_calendario'] },

  ]
  
  return (
    <aside className="sidebar">
      <ul>
        {menu.filter(item => can(user, item.perms)).map((m,i)=> (
          <li key={i}><a href={m.route}>{m.label}</a></li>
        ))}
      </ul>
    </aside>
  )
}
