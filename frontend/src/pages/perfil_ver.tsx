import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function PerfilVer(){
  const [d, setD] = useState<any>(null)
  
  useEffect(() => {
    // Primero intentar desde localStorage
    const storedUser = localStorage.getItem('userData')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setD(userData)
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
    
    // Luego cargar desde API para actualizar
    api.me().then(user => {
      if (user) {
        setD(user)
      }
    }).catch(err => {
      console.error('Error cargando perfil:', err)
    })
  }, [])
  
  if (!d) return <div className="loading">Cargando perfil...</div>

  return (
    <div className="card">
      <h1 className="text-xl font-bold">Mi perfil</h1>
      <div className="grid" style={{display:'grid', gap:6, marginTop:8}}>
        <div><span className="badge">Correo electrónico</span> {d.email}</div>
        <div><span className="badge">Nombres</span> {d.nombres || '-'}</div>
        <div><span className="badge">Apellidos</span> {d.apellidos || '-'}</div>
        <div><span className="badge">Teléfono</span> {d.telefono || '-'}</div>
        <div><span className="badge">Rol</span> {d.rol || '-'}</div>
      </div>
      <a className="btn" href="/perfil/editar" style={{marginTop:12}}>Editar</a>
    </div>
  )
}