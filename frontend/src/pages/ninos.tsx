import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/modal'

type Row = {
  id: string
  codigo: string
  nombres: string
  apellidos: string
  nivel?: string | null
  subnivel?: string | null
  maestro_id?: string | null
}

type Nivel = { id:string; nombre:string }
type Sub = { id:string; nombre:string }
type User = { id:string; nombres:string; apellidos:string; email:string }

export default function Ninos(){
  const [rows,setRows]=useState<Row[]>([])
  const [niveles,setNiveles]=useState<Nivel[]>([])
  const [subs,setSubs]=useState<Sub[]>([])
  const [colabs,setColabs]=useState<User[]>([])
  const [q,setQ]=useState('')
  const [edit,setEdit]=useState<any|null>(null)
  const [saving,setSaving]=useState(false)
  const [loading,setLoading]=useState(true)

  const load=async()=>{
    setLoading(true)
    try{
      const data = await api.ninos_list(q)
      setRows(data)
    } finally { setLoading(false) }
  }

  useEffect(()=>{ void load() },[q])
  useEffect(()=>{ 
    api.niveles_list().then(setNiveles)
    api.subniveles_list().then(setSubs)
    api.usuarios_por_rol?.('colaboradores').then(setColabs).catch(()=>setColabs([]))
  },[])

  const abrirNuevo=()=> setEdit({ id:null, codigo:'', nombres:'', apellidos:'', fecha_nacimiento:'', nivel_id:'', subnivel_id:'', maestro_id:'' })
  const abrirEditar=(r:Row)=> setEdit({
    id:r.id, codigo:r.codigo || '', nombres:r.nombres, apellidos:r.apellidos,
    fecha_nacimiento:'', nivel_id:'', subnivel_id:'', maestro_id:r.maestro_id||''
  })
  const cerrar=()=> setEdit(null)

  const guardar=async()=>{
    if (!edit) return
    if (!edit.nombres.trim() || !edit.apellidos.trim()) { alert('completa nombres y apellidos'); return }
    setSaving(true)
    try{
      if (edit.id){
        await api.ninos_update(edit.id, {
          codigo: edit.codigo.trim(),
          nombres: edit.nombres.trim(),
          apellidos: edit.apellidos.trim(),
          fecha_nacimiento: edit.fecha_nacimiento || null,
          nivel_id: edit.nivel_id || null,
          subnivel_id: edit.subnivel_id || null,
          maestro_id: edit.maestro_id || null
        })
      } else {
        await api.ninos_create({
          codigo: edit.codigo.trim() || undefined,
          nombres: edit.nombres.trim(),
          apellidos: edit.apellidos.trim(),
          fecha_nacimiento: edit.fecha_nacimiento || null,
          nivel_id: edit.nivel_id || null,
          subnivel_id: edit.subnivel_id || null,
          maestro_id: edit.maestro_id || null
        })
      }
      setEdit(null)
      await load()
    } catch(e:any){
      alert(e?.message || 'error')
    } finally { setSaving(false) }
  }

  const eliminar=async(id:string)=>{ if(confirm('eliminar?')){ await api.ninos_delete(id); await load() } }

  return (
    <div>
      <h1>ninos</h1>

      <div style={{display:'flex', gap:8, marginBottom:8}}>
        <input className="input" placeholder="buscar por nombre o codigo" value={q} onChange={e=>setQ(e.target.value)} />
        <button className="btn" onClick={abrirNuevo}>nuevo</button>
      </div>

      {loading ? (
        <div className="loading">cargando...</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>codigo</th>
              <th>nombres</th>
              <th>apellidos</th>
              <th>nivel</th>
              <th>subnivel</th>
              <th>acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id}>
                <td>{r.codigo}</td>
                <td>{r.nombres}</td>
                <td>{r.apellidos}</td>
                <td>{r.nivel||'-'}</td>
                <td>{r.subnivel||'-'}</td>
                <td>
                  <a className="btn" href={`/ninos/${r.id}`}>ver</a>{' '}
                  <button className="btn" onClick={()=>abrirEditar(r)}>editar</button>{' '}
                  <button className="btn" onClick={()=>eliminar(r.id)}>eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal open={!!edit} title={edit?.id?'editar nino':'nuevo nino'} onClose={cerrar}
        actions={<>
          <button className="btn" onClick={guardar} disabled={saving}>{saving?'guardando...':'guardar'}</button>
          <button className="linklike" onClick={cerrar}>cancelar</button>
        </>}>
        {edit && (
          <div className="form">
            <label>codigo (si lo dejas vacio se genera automatico)</label>
            <input className="input" value={edit.codigo} onChange={e=>setEdit({...edit, codigo:e.target.value})} />

            <label>nombres</label>
            <input className="input" value={edit.nombres} onChange={e=>setEdit({...edit, nombres:e.target.value})} required />

            <label>apellidos</label>
            <input className="input" value={edit.apellidos} onChange={e=>setEdit({...edit, apellidos:e.target.value})} required />

            <label>fecha de nacimiento</label>
            <input className="input" type="date" value={edit.fecha_nacimiento||''} onChange={e=>setEdit({...edit, fecha_nacimiento:e.target.value})} />

            <label>nivel</label>
            <select className="input" value={edit.nivel_id||''} onChange={e=>setEdit({...edit, nivel_id:e.target.value})}>
              <option value="">(sin nivel)</option>
              {niveles.map(n=><option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>

            <label>subnivel</label>
            <select className="input" value={edit.subnivel_id||''} onChange={e=>setEdit({...edit, subnivel_id:e.target.value})}>
              <option value="">(sin subnivel)</option>
              {subs.map(s=><option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>

            <label>colaborador (maestro)</label>
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
