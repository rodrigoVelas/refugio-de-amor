import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { can } from '../lib/permissions'

type Act = {
  id:string
  fecha:string
  hora?:string|null
  titulo:string
  descripcion?:string|null
  estado:'pendiente'|'completada'
}

function fmtDate(d:Date){ return d.toISOString().slice(0,10) }
function firstDayOfMonth(d:Date){ return new Date(d.getFullYear(), d.getMonth(), 1) }
function lastDayOfMonth(d:Date){ return new Date(d.getFullYear(), d.getMonth()+1, 0) }
function addMonths(d:Date, n:number){ return new Date(d.getFullYear(), d.getMonth()+n, 1) }
function dayKey(s:string){ return (s||'').slice(0,10) } // <-- normaliza a YYYY-MM-DD

export default function Actividades({ user }:{ user:any }){
  const [cur, setCur] = useState(()=> firstDayOfMonth(new Date()))
  const [rows, setRows] = useState<Act[]>([])
  const [loading, setLoading] = useState(false)
  const [selDate, setSelDate] = useState<string|null>(null)
  const [editing, setEditing] = useState<Act|null>(null)
  const [err, setErr] = useState<string>('')
  const [toast, setToast] = useState<string>('')

  const isAdmin = can(user, ['actividades_admin'])

  function notify(msg:string){
    setToast(msg); setTimeout(()=> setToast(''), 2500)
    if ('Notification' in window){
      if (Notification.permission === 'granted'){
        new Notification('refugio de amor', { body: msg })
      }else if (Notification.permission !== 'denied'){
        Notification.requestPermission().then(p=>{ if(p==='granted') new Notification('refugio de amor', { body: msg }) })
      }
    }
  }

  const range = useMemo(()=>{
    const from = fmtDate(firstDayOfMonth(cur))
    const to   = fmtDate(lastDayOfMonth(cur))
    return { from, to }
  }, [cur])

  const load = async ()=>{
    setLoading(true); setErr('')
    try{
      const data = await api.actividades_list(range.from, range.to)
      setRows(Array.isArray(data) ? data : [])
    }catch(e:any){
      setErr(e?.message || 'error cargando actividades')
    }finally{
      setLoading(false)
    }
  }
  useEffect(()=>{ void load() }, [range.from, range.to])

  // grilla calendario
  const gridDays = useMemo(()=>{
    const start = firstDayOfMonth(cur)
    const end = lastDayOfMonth(cur)
    const startWeekday = start.getDay() === 0 ? 7 : start.getDay()
    const lead = startWeekday - 1
    const daysInMonth = end.getDate()
    const total = lead + daysInMonth
    const tail = (total % 7 === 0) ? 0 : (7 - (total % 7))
    const totalCells = total + tail
    const firstCell = new Date(start); firstCell.setDate(firstCell.getDate() - lead)
    const cells: {date:Date, inMonth:boolean}[] = []
    for(let i=0;i<totalCells;i++){
      const d = new Date(firstCell); d.setDate(firstCell.getDate() + i)
      cells.push({ date:d, inMonth: d.getMonth() === cur.getMonth() })
    }
    return cells
  }, [cur])

  // agrupar por dia (normalizando fecha)
  const actsByDay = useMemo(()=>{
    const map: Record<string, Act[]> = {}
    for(const a of rows){
      const key = dayKey(a.fecha)
      ;(map[key] = map[key] || []).push(a)
    }
    // ordenar por hora dentro del dia
    for(const k of Object.keys(map)){
      map[k].sort((a,b)=> ((a.hora||'') < (b.hora||'')) ? -1 : 1)
    }
    return map
  }, [rows])

  // crear / editar
  const [form, setForm] = useState({ titulo:'', fecha:'', hora:'', descripcion:'' })
  const openCreateIn = (dateStr:string)=>{
    setSelDate(dateStr)
    setEditing(null)
    setForm({ titulo:'', fecha:dateStr, hora:'', descripcion:'' })
  }
  const saveCreate = async (e:any)=>{
    e.preventDefault()
    try{
      await api.actividades_create({
        titulo: form.titulo,
        fecha: form.fecha,
        hora: form.hora || null,
        descripcion: form.descripcion || ''
      })
      await load()
      notify('actividad creada')
      // mantenemos abierto el modal del dia seleccionado
      setForm({ titulo:'', fecha: form.fecha, hora:'', descripcion:'' })
    }catch(ex:any){
      alert(ex?.message || 'error al crear')
    }
  }
  const startEdit = (a:Act)=>{ 
    setEditing({...a})
    setSelDate(dayKey(a.fecha))
    setForm({ titulo:a.titulo, fecha:dayKey(a.fecha), hora:a.hora||'', descripcion:a.descripcion||'' })
  }
  const saveEdit = async (e:any)=>{
    e.preventDefault()
    if(!editing) return
    try{
      await api.actividades_update(editing.id, {
        titulo: form.titulo,
        fecha: form.fecha,
        hora: form.hora || null,
        descripcion: form.descripcion || '',
        estado: editing.estado
      })
      await load()
      notify('actividad actualizada')
      setEditing(null)
    }catch(ex:any){
      alert(ex?.message || 'error al guardar')
    }
  }
  const toggleEstado = async (a:Act)=>{
    if(!isAdmin) return
    try{
      await api.actividades_update(a.id, { ...a, fecha:dayKey(a.fecha), estado: a.estado==='pendiente' ? 'completada' : 'pendiente' })
      await load()
      notify(a.estado==='pendiente' ? 'actividad completada' : 'actividad pendiente')
    }catch(ex:any){ alert(ex?.message || 'error al cambiar estado') }
  }
  const removeAct = async (a:Act)=>{
    if(!isAdmin) return
    if(!confirm('eliminar actividad?')) return
    try{
      await api.actividades_delete(a.id)
      await load()
      notify('actividad eliminada')
    }catch(ex:any){ alert(ex?.message || 'error al eliminar') }
  }

  const monthName = cur.toLocaleString('es', { month:'long', year:'numeric' })

  return (
    <div className="content">
      {toast && <div className="toast">{toast}</div>}

      <div className="card">
        <div className="card-header">
          <h1 className="text-xl font-bold">Actividades del mes</h1>
          <div className="flex">
            <button className="btn-ghost" onClick={()=>setCur(addMonths(cur,-1))}>← mes anterior</button>
            <button className="btn-ghost" onClick={()=>setCur(new Date())}>hoy</button>
            <button className="btn-ghost" onClick={()=>setCur(addMonths(cur, 1))}>mes siguiente →</button>
          </div>
        </div>
        <div style={{opacity:.85}}>{monthName}</div>
        {loading && <div className="loading" style={{marginTop:8}}>Cargando...</div>}
        {err && <div className="alert" style={{marginTop:8}}>{err}</div>}
      </div>

      <div className="card" style={{padding:0}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', borderBottom:'1px solid var(--border)'}}>
          {['Lun','Mar','Mie','Jue','Vie','Sab','Dom'].map(d=>(
            <div key={d} style={{padding:'10px 12px', fontWeight:800, color:'var(--muted)'}}>{d}</div>
          ))}
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', minHeight:'60vh'}}>
          {gridDays.map((g, idx)=>{
            const ds = fmtDate(g.date)
            const acts = actsByDay[ds] || []
            return (
              <div key={idx}
                   className="day-cell"
                   onClick={()=>setSelDate(ds)}
                   style={{
                     borderRight: idx%7===6 ? '0' : '1px solid var(--border)',
                     borderBottom: '1px solid var(--border)',
                     background: g.inMonth ? 'transparent' : 'rgba(255,255,255,0.02)'
                   }}>
                <div className="day-head">
                  <span className="day-num">{g.date.getDate()}</span>
                  {isAdmin && g.inMonth && (
                    <button className="btn-dot" title="nueva actividad"
                            onClick={(e)=>{ e.stopPropagation(); openCreateIn(ds) }}>+</button>
                  )}
                </div>

                <div className="day-list" onClick={(e)=> e.stopPropagation()}>
                  {/* ya NO mostramos 'sin actividades' */}
                  {acts.map(a=>(
                    <div key={a.id}
                         className={'day-item'+(a.estado==='completada'?' done':'')}
                         title={a.descripcion||''}>
                      <span className="time">{a.hora ? a.hora.slice(0,5) : '--:--'}</span>
                      <span className="title">{a.titulo}</span>
                      {isAdmin && (
                        <span className="item-actions">
                          <button className="mini" onClick={()=>toggleEstado(a)} title="cambiar estado">✓</button>
                          <button className="mini" onClick={()=>startEdit(a)} title="editar">✎</button>
                          <button className="mini danger" onClick={()=>removeAct(a)} title="eliminar">🗑</button>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* modal del dia */}
      {selDate && (
        <div className="modal-backdrop" onClick={()=>setSelDate(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold">Actividades del dia {selDate}</h3>
              <button className="btn-ghost" onClick={()=>setSelDate(null)}>cerrar</button>
            </div>

            <div className="card" style={{marginBottom:12}}>
              <table className="table">
                <thead><tr><th>Hora</th><th>Titulo</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {(actsByDay[selDate]||[]).map(a=>(
                    <tr key={a.id}>
                      <td>{a.hora ? a.hora.slice(0,5) : '-'}</td>
                      <td title={a.descripcion||''}>{a.titulo}</td>
                      <td><span className={`badge ${a.estado==='completada'?'success':''}`}>{a.estado}</span></td>
                      <td className="actions">
                        {isAdmin ? (
                          <>
                            <button className="btn-ghost" onClick={()=>toggleEstado(a)}>
                              {a.estado==='pendiente' ? 'marcar completada' : 'marcar pendiente'}
                            </button>
                            <button className="btn-ghost" onClick={()=>startEdit(a)}>Editar</button>
                            <button className="btn-danger" onClick={()=>removeAct(a)}>Eliminar</button>
                          </>
                        ) : <span className="badge gray">Solo lectura</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isAdmin ? (
              <form className="form" onSubmit={editing ? saveEdit : saveCreate}>
                <input className="input" placeholder="titulo"
                  value={form.titulo} onChange={e=>setForm({...form, titulo:e.target.value})} required />
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
                  <input className="input" type="date" value={form.fecha}
                    onChange={e=>setForm({...form, fecha:e.target.value})} required />
                  <input className="input" type="time" value={form.hora}
                    onChange={e=>setForm({...form, hora:e.target.value})} />
                </div>
                <textarea className="textarea" placeholder="descripcion (opcional)" rows={3}
                  value={form.descripcion} onChange={e=>setForm({...form, descripcion:e.target.value})} />
                <div className="flex">
                  <button className="btn">{editing ? 'guardar cambios' : 'crear'}</button>
                  {editing && (
                    <button type="button" className="btn-ghost" onClick={()=>{
                      setEditing(null); setForm({ titulo:'', fecha: selDate!, hora:'', descripcion:'' })
                    }}>cancelar edicion</button>
                  )}
                </div>
              </form>
            ) : (
              <div className="alert">Solo la directora puede crear o editar actividades</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
