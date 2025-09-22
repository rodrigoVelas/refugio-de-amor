import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function PerfilVer(){
  const [d,setD] = useState<any>(null)
  useEffect(()=>{ api.perfil_get().then(setD) },[])
  if(!d) return <div className="loading">Cargando perfil...</div>

  return (
    <div className="card">
      <h1 className="text-xl font-bold">Mi perfil</h1>
      <div className="grid" style={{display:'grid', gap:6, marginTop:8}}>
        <div><span className="badge">Correo electronico</span> {d.email}</div>
        <div><span className="badge">Nombres</span> {d.nombres || '-'}</div>
        <div><span className="badge">Apellidos</span> {d.apellidos || '-'}</div>
        <div><span className="badge">Telefono</span> {d.telefono || '-'}</div>
      </div>
      <a className="btn" href="/perfil/editar" style={{marginTop:12}}>Editar</a>
    </div>
  )
}
