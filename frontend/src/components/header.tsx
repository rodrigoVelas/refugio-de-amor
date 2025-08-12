import { api } from '../lib/api'
export default function Header({ user }:{ user:any }){
  const logout = async ()=>{ await api.logout(); location.reload() }
  return (
    <header className='hdr'>
      <a className='brand' href='/inicio'>REFUGIO DE AMOR</a>
      <nav className='hdr-actions'>
        <div className='dropdown'>
          <button className='icon-btn'><img className='avatar' src={user?.avatar_url || '/avatar.png'} alt='perfil' /></button>
          <ul className='menu'>
            <li><a href='/perfil'>Mi Perfil</a></li>
            <li><button className='linklike' onClick={logout}>Cerrar Sesion</button></li>
          </ul>
        </div>
      </nav>
    </header>
  )
}
