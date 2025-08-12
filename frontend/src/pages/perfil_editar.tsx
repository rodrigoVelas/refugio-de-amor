import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function PerfilEditar(){
  const [f,setF] = useState({nombres:'', apellidos:'', telefono:''})
  const [saving, setSaving] = useState(false)

  useEffect(()=>{ api.perfil_get().then(d=> setF({
    nombres: d.nombres || '', apellidos: d.apellidos || '', telefono: d.telefono || ''
  })) },[])

  const on=(e:any)=> setF({...f, [e.target.name]: e.target.value})

  const save=async(e:any)=>{
    e.preventDefault()
    setSaving(true)
    try{
      await api.perfil_update({
        nombres: f.nombres.trim(),
        apellidos: f.apellidos.trim(),
        telefono: f.telefono.trim()
      })
      location.href='/perfil'
    } finally { setSaving(false) }
  }

  return (
    <div className="card">
      <h1>editar perfil</h1>
      <form onSubmit={save} className="form" style={{marginTop:8}}>
        <label>nombres</label>
        <input className="input" name="nombres" value={f.nombres} onChange={on} required />
        <label>apellidos</label>
        <input className="input" name="apellidos" value={f.apellidos} onChange={on} required />
        <label>telefono</label>
        <input className="input" name="telefono" value={f.telefono} onChange={on} />
        <button className="btn" disabled={saving}>{saving?'guardando...':'guardar'}</button>
      </form>
    </div>
  )
}
