import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../lib/api'

export default function NinoDetalle(){
  const { id } = useParams()
  const [d,setD] = useState<any>(null)
  useEffect(()=>{ if(id) api.ninos_get(id).then(setD) },[id])
  if(!d) return <div className="loading">cargando...</div>

  return (
    <div className="card">
      <h1>Detalles del Niño</h1>
      <div style={{display:'grid', gap:6, marginTop:8}}>
        <div><b>nombres:</b> {d.nombres}</div>
        <div><b>apellidos:</b> {d.apellidos}</div>
        <div><b>Fecha nacimiento:</b> {d.fecha_nacimiento || '-'}</div>
        <div><b>nivel:</b> {d.nivel_nombre || '-'}</div>
        <div><b>subnivel:</b> {d.subnivel_nombre || '-'}</div>
        <div><b>maestro:</b> {d.maestro_nombre || '-'}</div>
      </div>
    </div>
  )
}
