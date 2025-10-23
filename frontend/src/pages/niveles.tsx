import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/modal'

type Nivel = { id:string; nombre:string; descripcion?:string|null }

export default function Niveles(){
  const [rows,setRows]=useState<Nivel[]>([])
  const [f,setF]=useState({nombre:'',descripcion:''})
  const [edit,setEdit]=useState<Nivel|null>(null)
  const [saving,setSaving]=useState(false)

  const load=()=> api.niveles_list().then(setRows)
  useEffect(()=>{ void load() },[])

  const crear=async(e:any)=>{
    e.preventDefault()
    if(!f.nombre.trim()) return
    setSaving(true)
    try{
      await api.niveles_create({ nombre:f.nombre.trim(), descripcion:f.descripcion.trim() })
      setF({nombre:'',descripcion:''})
      await load()
    } finally { setSaving(false) }
  }

  const abrirEditar=(n:Nivel)=> setEdit({ ...n })
  const cerrarEditar=()=> setEdit(null)

  const guardarEdicion=async()=>{
    if(!edit) return
    setSaving(true)
    try{
      await api.niveles_update(edit.id, {
        nombre: (edit.nombre||'').trim(),
        descripcion: (edit.descripcion||'').toString().trim()
      })
      setEdit(null)
      await load()
    } finally { setSaving(false) }
  }

  const eliminar=async(id:string)=>{
    if(!confirm('eliminar?')) return
    await api.niveles_delete(id); await load()
  }

  return (
    <div>
      <h1>Niveles</h1>

      <form className="form" onSubmit={crear}>
        <input className="input" placeholder="nombre" value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})} required />
        <input className="input" placeholder="descripcion" value={f.descripcion} onChange={e=>setF({...f,descripcion:e.target.value})} />
        <button className="btn" disabled={saving}>{saving?'guardando...':'crear'}</button>
      </form>

      <table className="table" style={{marginTop:12}}>
        <thead><tr><th>Nombre</th><th>Descripcion</th><th>Acciones</th></tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id}>
              <td>{r.nombre}</td>
              <td>{r.descripcion || '-'}</td>
              <td>
                <button className="btn" onClick={()=>abrirEditar(r)}>editar</button>{' '}
                <button className="btn" onClick={()=>eliminar(r.id)}>eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={!!edit} title="editar nivel" onClose={cerrarEditar}
        actions={<>
          <button className="btn" onClick={guardarEdicion} disabled={saving}>{saving?'guardando...':'guardar'}</button>
          <button className="linklike" onClick={cerrarEditar}>cancelar</button>
        </>}>
        {edit && (
          <div className="form">
            <label>Nombre</label>
            <input className="input" value={edit.nombre} onChange={e=>setEdit({...edit!, nombre:e.target.value})} />
            <label>Descripcion</label>
            <input className="input" value={edit.descripcion||''} onChange={e=>setEdit({...edit!, descripcion:e.target.value})} />
          </div>
        )}
      </Modal>
    </div>
  )
}
