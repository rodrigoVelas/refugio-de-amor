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
import Documentos from './pages/documentos'





function RequirePerms({ user, perms, children }: { user: any; perms: string[]; children: any }) {
  if (!can(user, perms)) return <div className="alert">No autorizado</div>
  return children
}

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = async () => {
    try {
      // Primero intentar desde localStorage
      const storedUser = localStorage.getItem('userData')
      const storedPerms = localStorage.getItem('userPerms')
      
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          const userPerms = storedPerms ? JSON.parse(storedPerms) : []
          
          // Validar que tenga datos mínimos necesarios
          if (userData && userData.id && userData.email) {
            console.log('✅ Usuario desde localStorage:', userData)
            setUser({ ...userData, perms: userPerms })
            setLoading(false)
            return
          } else {
            console.log('❌ Datos inválidos en localStorage, limpiando...')
            localStorage.removeItem('userData')
            localStorage.removeItem('userPerms')
          }
        } catch (parseError) {
          console.error('❌ Error parseando localStorage:', parseError)
          localStorage.removeItem('userData')
          localStorage.removeItem('userPerms')
        }
      }
      
      // Si no hay datos válidos en localStorage, intentar desde API
      console.log('🔍 Intentando cargar usuario desde API...')
      const u = await api.me()
      console.log('Usuario desde API:', u)
      
      if (u && u.id) {
        setUser(u)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('❌ Error cargando usuario:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        fontSize: '1.2rem',
        color: '#64748b'
      }}>
        Cargando...
      </div>
    )
  }

  if (!user) {
    return <Login onDone={(userData) => {
      console.log('✅ Login completado con datos:', userData)
      
      // Validar que los datos sean correctos
      if (userData && userData.id && userData.email) {
        setUser(userData)
        setLoading(false)
      } else {
        console.error('❌ Datos de usuario inválidos recibidos del login')
        alert('Error al iniciar sesión. Por favor, intenta de nuevo.')
        localStorage.clear()
      }
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

        {/* Rutas de dashboards por rol */}
        <Route path="/directora/dashboard" element={
          <RequirePerms user={user} perms={['ver_niveles']}>
            <Inicio />
          </RequirePerms>
        } />
        
        <Route path="/contabilidad/dashboard" element={
          <RequirePerms user={user} perms={['facturas_ver_todas']}>
            <Inicio />
          </RequirePerms>
        } />
        
        <Route path="/colaboradores/dashboard" element={
          <RequirePerms user={user} perms={['ver_ninos']}>
            <Inicio />
          </RequirePerms>
        } />
        
        <Route path="*" element={
          <div className="alert" style={{ margin: '2rem' }}>
            Página no encontrada
          </div>
        } />
        <Route path="/documentos" element={<Documentos />} />
      </Routes>
    </AppLayout>
  )
}