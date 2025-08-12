import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/modal'

type Row = { id:string; nombres:string; apellidos:string; nivel?:string|null; subnivel?:string|null; maestro_id?:string|null }
type Nivel = { id:string; nombre:string }
type Sub = { id:string; nombre:string }
type User = { id:string; nombres:string; apellidos:string; email:string }

export default function Ninos(){
  const [rows,setRows]=useState<Row[]>([])
  const [niveles,setNiveles]=useState<Nivel[]>([])
  const [subs,setSubs]=useState<Sub[]>([])
  const [colabs,setColabs]=useState<User[]>([])
  const [q,setQ]=useState('')
  const [edit,setEdit]=useState<any|null>(null)         // para crear/editar en el mismo modal
  const [saving,setSaving]=useState(false)

  const load=()=> api.ninos_list(q).then(setRows)
  useEffect(()=>{ void load() },[q])
  useEffect(()=>{ 
    api.niveles_list().then(setNiveles)
    api.subniveles_list().then(setSubs)
    api.usuarios_por_rol('colaboradores').then(setColabs)
  },[])

  const abrirNuevo=()=> setEdit({ id:null, nombres:'', apellidos:'', fecha_nacimiento:'', nivel_id:'', subnivel_id:'', maestro_id:'' })
  const abrirEditar=(r:Row)=> setEdit({ id:r.id, nombres:r.nombres, apellidos:r.apellidos, fecha_nacimiento:'', nivel_id:'', subnivel_id:'', maestro_id:r.maestro_id||'' })
  const cerrar=()=> setEdit(null)

  const guardar=async()=>{
    if (!edit) return
    if (!edit.nombres.trim() || !edit.apellidos.trim()) { alert('completa nombres y apellidos'); return }
    setSaving(true)
    try{
      if (edit.id){
        await api.ninos_update(edit.id, {
          nombres: edit.nombres.trim(),
          apellidos: edit.apellidos.trim(),
          fecha_nacimiento: edit.fecha_nacimiento || null,
          nivel_id: edit.nivel_id || null,
          subnivel_id: edit.subnivel_id || null,
          maestro_id: edit.maestro_id || null
        })
      } else {
        await api.ninos_create({
          nombres: edit.nombres.trim(),
          apellidos: edit.apellidos.trim(),
          fecha_nacimiento: edit.fecha_nacimiento,
          nivel_id: edit.nivel_id || null,
          subnivel_id: edit.subnivel_id || null,
          maestro_id: edit.maestro_id || null
        })
      }
      setEdit(null)
      await load()
    } finally { setSaving(false) }
  }

  const eliminar=async(id:string)=>{ if(confirm('eliminar?')){ await api.ninos_delete(id); await load() } }

  return (
    <div>
      <h1>Niños</h1>

      <div style={{display:'flex', gap:8, marginBottom:8}}>
        <input className="input" placeholder="buscar por nombre" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="btn" onClick={abrirNuevo}>nuevo</button>
      </div>

      <table className="table">
        <thead><tr><th>Nombres</th><th>Apellidos</th><th>Nivel</th><th>Subnivel</th><th>acciones</th></tr></thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id}>
              <td>{r.nombres}</td>
              <td>{r.apellidos}</td>
              <td>{r.nivel||'-'}</td>
              <td>{r.subnivel||'-'}</td>
              <td>
                <a className="btn" href={`/ninos/${r.id}`}>ver</a>{' '}
                <button className="btn" onClick={()=>abrirEditar(r)}>Editar</button>{' '}
                <button className="btn" onClick={()=>eliminar(r.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={!!edit} title={edit?.id?'Editar niño':'Nuevo niño'} onClose={cerrar}
        actions={<>
          <button className="btn" onClick={guardar} disabled={saving}>{saving?'Guardando...':'Guardar'}</button>
          <button className="linklike" onClick={cerrar}>Cancelar</button>
        </>}>
        {edit && (
          <div className="form">
            <label>Nombres</label>
            <input className="input" value={edit.nombres} onChange={e=>setEdit({...edit, nombres:e.target.value})} required />

            <label>Apellidos</label>
            <input className="input" value={edit.apellidos} onChange={e=>setEdit({...edit, apellidos:e.target.value})} required />

            <label>Fecha de nacimiento</label>
            <input className="input" type="date" value={edit.fecha_nacimiento||''} onChange={e=>setEdit({...edit, fecha_nacimiento:e.target.value})} />

            <label>Nivel</label>
            <select className="input" value={edit.nivel_id||''} onChange={e=>setEdit({...edit, nivel_id:e.target.value})}>
              <option value="">(sin nivel)</option>
              {niveles.map(n=><option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>

            <label>Subnivel</label>
            <select className="input" value={edit.subnivel_id||''} onChange={e=>setEdit({...edit, subnivel_id:e.target.value})}>
              <option value="">(sin subnivel)</option>
              {subs.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>

            <label>Colaborador (maestro)</label>
            <select className="input" value={edit.maestro_id||''} onChange={e=>setEdit({...edit, maestro_id:e.target.value})}>
              <option value="">(sin asignar)</option>
              {colabs.map(c=><option key={c.id} value={c.id}>{c.nombres} {c.apellidos}</option>)}
            </select>
          </div>
        )}
      </Modal>
    </div>
  )
}
