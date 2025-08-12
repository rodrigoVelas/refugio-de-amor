import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function PerfilVer(){
  const [d,setD] = useState<any>(null)
  useEffect(()=>{ api.perfil_get().then(setD) },[])
  if(!d) return <div className="loading">cargando perfil...</div>

  return (
    <div className="card">
      <h1 className="text-xl font-bold">mi perfil</h1>
      <div className="grid" style={{display:'grid', gap:6, marginTop:8}}>
        <div><span className="badge">email</span> {d.email}</div>
        <div><span className="badge">nombres</span> {d.nombres || '-'}</div>
        <div><span className="badge">apellidos</span> {d.apellidos || '-'}</div>
        <div><span className="badge">telefono</span> {d.telefono || '-'}</div>
      </div>
      <a className="btn" href="/perfil/editar" style={{marginTop:12}}>editar</a>
    </div>
  )
}
