import { Link, useLocation } from 'react-router-dom'
import { can } from '../lib/permissions'

export default function Sidebar({ user }: { user: any }) {
  const location = useLocation()
  
  // Verificar si puede ver reportes (directora o contabilidad)
  const puedeVerReportes = user?.rol?.toLowerCase() === 'directora' || 
                           user?.rol?.toLowerCase() === 'contabilidad'
  
  const menu = [
    { label: 'Inicio', route: '/inicio', perms: ['*'], icon: '' },
    { label: 'Mi perfil', route: '/perfil', perms: ['ver_perfil'], icon: '' },
    { label: 'Niños', route: '/ninos', perms: ['ver_ninos'], icon: '' },
    { label: 'Niveles', route: '/niveles', perms: ['ver_niveles'], icon: '' },
    { label: 'Subniveles', route: '/subniveles', perms: ['ver_niveles'], icon: '' },
    { label: 'Asistencia', route: '/asistencia', perms: ['asistencia_ver_propias', 'asistencia_ver_todas'], icon: '' },
    { label: 'Facturas', route: '/facturas', perms: ['facturas_ver_propias', 'facturas_ver_todas'], icon: '' },
    { label: 'Documentos', route: '/documentos', perms: ['*'], icon: '' },
    { label: 'Actividades', route: '/actividades', perms: ['actividades_ver_calendario'], icon: '' },
    // Reportes - solo para directora y contabilidad
    ...(puedeVerReportes ? [{ label: 'Reportes', route: '/reportes', perms: ['*'], icon: '' }] : []),
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
                {m.icon && <span style={{ marginRight: '0.5rem' }}>{m.icon}</span>}
                <span>{m.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}