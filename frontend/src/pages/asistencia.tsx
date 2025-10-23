import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/modal'

type Sesion = { id:string; fecha:string; hora:string; presentes?:number }
type Nino = { id:string; codigo:string; nombres:string; apellidos:string }
type Marca = { nino_id:string; estado:'presente'|'ausente'|'suplente'; nota?:string }

export default function Asistencia(){
  const [rows,setRows] = useState<Sesion[]>([])
  const [openNueva,setOpenNueva] = useState(false)
  const [f,setF] = useState({ fecha:'', hora:'' })
  const [saving,setSaving] = useState(false)

  const [openMarcar,setOpenMarcar] = useState(false)
  const [sesionId,setSesionId] = useState<string>('')
  const [ninos,setNinos] = useState<Nino[]>([])
  const [marcas,setMarcas] = useState<Record<string,Marca>>({})
  const [tituloModal,setTituloModal] = useState('marcar asistencia')

  const load = async ()=>{ 
    try {
      const d = await api.asistencia_list()
      setRows(d)
    } catch (e:any){
      console.error('error cargando sesiones', e)
    }
  }
  useEffect(()=>{ void load() },[])

  const crearSesion = async ()=>{
    if(!f.fecha || !f.hora){ alert('completa fecha y hora'); return }
    setSaving(true)
    try{
      const s = await api.asistencia_create({ fecha:f.fecha, hora:f.hora })
      setOpenNueva(false); setF({fecha:'', hora:''})
      await abrirEditorDeSesion(s.id, true)
      await load()
    } catch (e:any){
      console.error('crearSesion error:', e)
      alert(e?.message || 'no se pudo crear la sesion')
    } finally { setSaving(false) }
  }

  const abrirEditorDeSesion = async (id:string, esNueva=false)=>{
    try {
      const d = await api.asistencia_editar_load(id)
      setSesionId(id)
      setTituloModal(esNueva ? 'marcar asistencia' : 'editar asistencia')

      const map:Record<string,Marca> = {}
      const byId:Record<string, any> = {}
      d.detalles.forEach((m:any)=>{ byId[m.nino_id] = m })
      for(const n of d.ninos){
        const m = byId[n.id]
        map[n.id] = { nino_id:n.id, estado: m?.estado || 'presente', nota: m?.nota || '' }
      }
      setNinos(d.ninos)
      setMarcas(map)
      setOpenMarcar(true)
    } catch (e:any){
      console.error('abrirEditorDeSesion error:', e)
      alert(e?.message || 'no se pudo cargar la sesion')
    }
  }

  const setEstado = (nino_id:string, estado:Marca['estado'])=>{
    setMarcas(prev => ({ ...prev, [nino_id]: { ...(prev[nino_id]||{nino_id}), estado } }))
  }
  const setNota = (nino_id:string, nota:string)=>{
    setMarcas(prev => ({ ...prev, [nino_id]: { ...(prev[nino_id]||{nino_id}), estado: prev[nino_id]?.estado || 'presente', nota } }))
  }

  const seleccionarTodos = ()=>{
    setMarcas(prev=>{
      const clone = {...prev}
      for(const n of ninos){ clone[n.id] = { ...(clone[n.id]||{nino_id:n.id}), estado:'presente', nota:clone[n.id]?.nota||'' } }
      return clone
    })
  }
  const limpiarTodos = ()=>{
    setMarcas(prev=>{
      const clone = {...prev}
      for(const n of ninos){ clone[n.id] = { ...(clone[n.id]||{nino_id:n.id}), estado:'ausente', nota:clone[n.id]?.nota||'' } }
      return clone
    })
  }

  const guardarMarcas = async ()=>{
    try {
      const items = Object.values(marcas)
      await api.asistencia_set_detalles(sesionId, items)
      setOpenMarcar(false)
      await load()
    } catch (e:any){
      console.error('guardarMarcas error:', e)
      alert(e?.message || 'no se pudo guardar la asistencia')
    }
  }

  const eliminarSesion = async (id:string)=>{
    if(!window.confirm('¿estas seguro de eliminar esta sesion de asistencia?')) return
    try {
      await api.asistencia_delete(id)
      await load()
    } catch (e:any){
      console.error('eliminarSesion error:', e)
      alert(e?.message || 'no se pudo eliminar la sesion')
    }
  }

  return (
    <div>
      <h1>Asistencia</h1>

      <div style={{marginBottom:8}}>
        <button className="btn" onClick={()=>setOpenNueva(true)}>Nueva sesion</button>
      </div>

      <table className="table">
        <thead><tr><th>Fecha</th><th>Hora</th><th>Presentes</th><th>Acciones</th></tr></thead>
        <tbody>
          {rows.map(s=>(
            <tr key={s.id}>
              <td>{s.fecha}</td>
              <td>{s.hora}</td>
              <td>{s.presentes ?? 0}</td>
              <td className="flex" style={{gap:8}}>
                <button className="btn" onClick={()=>abrirEditorDeSesion(s.id, false)}>Editar</button>
                <a className="btn" href={api.asistencia_export_url(s.id,'csv')} target="_blank" rel="noreferrer">Descargar asistencia</a>
                <button className="btn" onClick={()=>eliminarSesion(s.id)}>eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* modal crear sesion */}
      <Modal open={openNueva} title="nueva sesion" onClose={()=>setOpenNueva(false)}
        actions={<>
          <button className="btn" onClick={crearSesion} disabled={saving}>{saving?'creando...':'crear y marcar'}</button>
          <button className="linklike" onClick={()=>setOpenNueva(false)}>Cancelar</button>
        </>}>
        <div className="form">
          <label>Fecha</label>
          <input className="input" type="date" value={f.fecha} onChange={e=>setF({...f, fecha:e.target.value})} />
          <label>Hora</label>
          <input className="input" type="time" value={f.hora} onChange={e=>setF({...f, hora:e.target.value})} />
        </div>
      </Modal>

      {/* modal marcar/editar */}
      <Modal open={openMarcar} title={tituloModal} onClose={()=>setOpenMarcar(false)}
        actions={<>
          {sesionId && (
            <a className="btn" href={api.asistencia_export_url(sesionId,'csv')} target="_blank" rel="noreferrer">
              Descargar asistencia
            </a>
          )}
          <button className="btn" onClick={guardarMarcas}>guardar</button>
          <button className="linklike" onClick={()=>setOpenMarcar(false)}>Cancelar</button>
        </>}>
        {ninos.length===0 ? <div className="alert">No tienes ninos asignados</div> : (
          <div style={{display:'grid', gap:10}}>
            <div style={{display:'flex', gap:8}}>
              <button className="btn" onClick={seleccionarTodos}>Seleccionar todos</button>
              <button className="btn" onClick={limpiarTodos}>Limpiar</button>
            </div>
            {ninos.map(n=>(
              <div key={n.id} className="card" style={{display:'grid', gap:6}}>
                <div style={{fontWeight:700}}>{n.codigo} · {n.nombres} {n.apellidos}</div>
                <div style={{display:'flex', gap:10, alignItems:'center'}}>
                  <label><input type="radio" name={`e-${n.id}`} checked={(marcas[n.id]?.estado==='presente')} onChange={()=>setEstado(n.id,'presente')} /> Presente</label>
                  <label><input type="radio" name={`e-${n.id}`} checked={(marcas[n.id]?.estado==='ausente')} onChange={()=>setEstado(n.id,'ausente')} /> Ausente</label>
                  <label><input type="radio" name={`e-${n.id}`} checked={(marcas[n.id]?.estado==='suplente')} onChange={()=>setEstado(n.id,'suplente')} /> Suplente</label>
                </div>
                <input className="input" placeholder="nota (opcional)" value={marcas[n.id]?.nota||''} onChange={e=>setNota(n.id, e.target.value)} />
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
