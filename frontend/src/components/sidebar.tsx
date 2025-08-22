import { can } from '../lib/permissions'

export default function Sidebar({ user }:{ user:any }){
  const menu = [
    { label:'Inicio', route:'/inicio', perms:['*'] },
    { label:'Niveles', route:'/niveles', perms:['ver_niveles'] },
    { label:'Subniveles', route:'/subniveles', perms:['ver_niveles'] },
    { label:'Niños', route:'/ninos', perms:['ver_ninos'] },
    { label:'Usuarios', route:'/admin/usuarios', perms:['ver_usuarios'] },
    { label:'Roles', route:'/admin/roles', perms:['ver_roles'] },
    { label:'Mi perfil', route:'/perfil', perms:['ver_perfil'] },
    { label:'Facturas', route:'/facturas', perms:['facturas_ver_propias','facturas_ver_todas'] },

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
