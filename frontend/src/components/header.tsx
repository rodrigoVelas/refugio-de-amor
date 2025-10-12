import { api } from '../lib/api'
import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Header({ user }: { user: any }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const logout = async () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      try {
        await api.logout()
      } catch (error) {
        console.error('Error en logout:', error)
      } finally {
        // IMPORTANTE: Limpiar localStorage
        localStorage.removeItem('userData')
        localStorage.removeItem('userPerms')
        localStorage.clear()
        
        // Redirigir al login
        window.location.href = '/'
      }
    }
  }

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen)
  }

  const closeProfile = () => {
    setIsProfileOpen(false)
  }

  return (
    <header className='hdr'>
      <div className='header-left'>
        <img
          src='/compassion-logo.png'
          alt='Compassion International'
          className='brand-logo'
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
        <a className='brand' href='/inicio'>REFUGIO DE AMOR</a>
      </div>

      <nav className='hdr-actions'>
        <div className='user-section'>
          {/* Perfil del Usuario */}
          <div className={`profile-dropdown ${isProfileOpen ? 'open' : ''}`}>
            <div className='user-profile' onClick={toggleProfile}>
              <img
                className='user-avatar'
                src={user?.avatar_url || '/avatar.png'}
                alt='perfil'
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLDivElement
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
              <div
                className='user-avatar-fallback'
                style={{ display: 'none' }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className='user-info'>
                <div className='user-name'>{user?.name || user?.email?.split('@')[0] || 'Usuario'}</div>
                <div className='user-role'>{user?.rol || 'Administrador'}</div>
              </div>
              <i className='material-icons' style={{ fontSize: '16px', color: '#64748b' }}>
                {isProfileOpen ? '' : ''}
              </i>
            </div>

            {/* Menú del Perfil */}
            <div className='profile-menu'>
              <div className='profile-header'>
                <div className='profile-avatar'>
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className='profile-details'>
                  <h4>{user?.name || user?.email?.split('@')[0] || 'Usuario'}</h4>
                  <p>{user?.email || 'usuario@refugio.local'}</p>
                </div>
              </div>
              <Link to='/perfil' className='profile-menu-item' onClick={closeProfile}>
  <i className='material-icons'></i>
  <span>Mi Perfil</span>
</Link>
            </div>
          </div>

          {/* Botón de Cerrar Sesión */}
          <button
            className='logout-button'
            onClick={logout}
            title='Cerrar Sesión'
            type='button'
          >
            <i className='material-icons'></i>
            <span className='logout-text'>Cerrar Sesión</span>
          </button>
        </div>
      </nav>
    </header>
  )
}