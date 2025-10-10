import { Link, useLocation } from 'react-router-dom'
import { can } from '../lib/permissions'

export default function Sidebar({ user }: { user: any }) {
  const location = useLocation()
  
  const menu = [
    { label: 'Inicio', route: '/inicio', perms: ['*'], icon: '' },
    { label: 'Mi perfil', route: '/perfil', perms: ['ver_perfil'], icon: '' },
    { label: 'Niños', route: '/ninos', perms: ['ver_ninos'], icon: '' },
    { label: 'Niveles', route: '/niveles', perms: ['ver_niveles'], icon: '' },
    { label: 'Subniveles', route: '/subniveles', perms: ['ver_niveles'], icon: '' },
    { label: 'Asistencia', route: '/asistencia', perms: ['asistencia_ver_propias', 'asistencia_ver_todas'], icon: '' },
    { label: 'Facturas', route: '/facturas', perms: ['facturas_ver_propias', 'facturas_ver_todas'], icon: '' },
    { label: 'Documentos', route: '/documentos', perms: ['*'], icon: 'folder' },
    { label: 'Actividades', route: '/actividades', perms: ['actividades_ver_calendario'], icon: '' },
    { label: 'Usuarios', route: '/admin/usuarios', perms: ['ver_usuarios'], icon: '' },
    // { label: 'Roles', route: '/admin/roles', perms: ['ver_roles'], icon: 'admin_panel_settings' },
  ]

  return (
    <aside className="sidebar">
      <ul>
        {menu.filter(item => can(user, item.perms)).map((m, i) => {
          const isActive = location.pathname === m.route
          return (
            <li key={i} className={isActive ? 'active' : ''}>
              <Link to={m.route} className="sidebar-link">
                {m.icon && <i className="material-icons">{m.icon}</i>}
                <span>{m.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}