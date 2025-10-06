import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './components/app_layout'
import Inicio from './pages/inicio'
import PerfilVer from './pages/perfil_ver'
import PerfilEditar from './pages/perfil_editar'
import Niveles from './pages/niveles'
import Subniveles from './pages/subniveles'
import Ninos from './pages/ninos'
import Usuarios from './pages/usuarios'
import Roles from './pages/roles'
import Login from './pages/login'
import { useEffect, useState } from 'react'
import { api } from './lib/api'
import { can } from './lib/permissions'
import NinoDetalle from './pages/nino_detalle'
import Facturas from './pages/facturas'
import Asistencia from './pages/asistencia'
import Actividades from './pages/actividades'

function RequirePerms({ user, perms, children }: { user: any; perms: string[]; children: any }) {
  if (!can(user, perms)) return <div className="alert">No autorizado</div>
  return children
}

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = async () => {
    try {
      const u = await api.me()
      console.log('Usuario cargado:', u) // Debug
      setUser(u)
    } catch (error) {
      console.error('Error cargando usuario:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  if (loading) return <div className="alert">Cargando...</div>

  if (!user) {
    return <Login onDone={() => {
      console.log('Login completado, recargando usuario...')
      setLoading(true)
      loadUser()
    }} />
  }

  return (
    <AppLayout user={user}>
      <Routes>
        <Route path="/" element={<Navigate to="/inicio" replace />} />
        <Route path="/inicio" element={<Inicio />} />
        
        <Route path="/perfil" element={
          <RequirePerms user={user} perms={['ver_perfil']}>
            <PerfilVer />
          </RequirePerms>
        } />
        
        <Route path="/perfil/editar" element={
          <RequirePerms user={user} perms={['editar_perfil_propio']}>
            <PerfilEditar />
          </RequirePerms>
        } />
        
        <Route path="/niveles" element={
          <RequirePerms user={user} perms={['ver_niveles']}>
            <Niveles />
          </RequirePerms>
        } />
        
        <Route path="/subniveles" element={
          <RequirePerms user={user} perms={['ver_niveles']}>
            <Subniveles />
          </RequirePerms>
        } />
        
        <Route path="/ninos" element={
          <RequirePerms user={user} perms={['ver_ninos']}>
            <Ninos />
          </RequirePerms>
        } />
        
        <Route path="/ninos/:id" element={
          <RequirePerms user={user} perms={['ver_ninos']}>
            <NinoDetalle />
          </RequirePerms>
        } />
        
        <Route path="/admin/usuarios" element={
          <RequirePerms user={user} perms={['ver_usuarios']}>
            <Usuarios />
          </RequirePerms>
        } />
        
        <Route path="/admin/roles" element={
          <RequirePerms user={user} perms={['ver_roles']}>
            <Roles />
          </RequirePerms>
        } />
        
        <Route path="/facturas" element={
          <RequirePerms user={user} perms={['facturas_ver_propias', 'facturas_ver_todas']}>
            <Facturas />
          </RequirePerms>
        } />
        
        <Route path="/asistencia" element={
          <RequirePerms user={user} perms={['asistencia_ver_propias', 'asistencia_ver_todas']}>
            <Asistencia />
          </RequirePerms>
        } />
        
        <Route path="/actividades" element={
          <RequirePerms user={user} perms={['actividades_ver_calendario']}>
            <Actividades user={user} />
          </RequirePerms>
        } />
        
        <Route path="*" element={<div className="alert">Página no encontrada</div>} />
      </Routes>
    </AppLayout>
  )
}