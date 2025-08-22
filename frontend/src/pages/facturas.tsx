import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/modal'
import { can } from '../lib/permissions'

type Factura = {
  id: string
  usuario_id: string
  descripcion: string | null
  imagen_path: string
  imagen_mime: string
  total: number | null
  fecha: string | null
  email?: string
  creado_en?: string
}

export default function Facturas(){
  const [rows,setRows] = useState<Factura[]>([])
  const [me,setMe] = useState<any>(null)
  const [open,setOpen] = useState(false)
  const [f,setF] = useState({ descripcion:'', total:'', fecha:'' })
  const [file,setFile] = useState<File|null>(null)
  const [saving,setSaving] = useState(false)
  const [loading,setLoading] = useState(true)

  const load = async ()=>{
    setLoading(true)
    try{
      const u = await api.me(); setMe(u)
      const d = await api.facturas_list(); setRows(d)
    } finally {
      setLoading(false)
    }
  }

  useEffect(()=>{ void load() },[])

  const puedeSubir = can(me, ['facturas_subir'])
  const verTodas = can(me, ['facturas_ver_todas'])

  const subir = async ()=>{
    if(!file){ alert('selecciona una imagen'); return }
    setSaving(true)
    try{
      const fd = new FormData()
      fd.append('imagen', file)
      if (f.descripcion) fd.append('descripcion', f.descripcion)
      if (f.total) fd.append('total', f.total)
      if (f.fecha) fd.append('fecha', f.fecha)
      await api.facturas_subir(fd)
      setOpen(false); setFile(null); setF({ descripcion:'', total:'', fecha:'' })
      await load()
    } finally { setSaving(false) }
  }

  const eliminar = async (id:string)=>{
    if(!confirm('eliminar factura?')) return
    await api.facturas_delete(id)
    await load()
  }

  // boton ver: resuelve string o Promise<string> sin romper el tipado del href
  const abrirImagen = async (id:string)=>{
    // soporta ambas variantes: api.facturas_img (string) o api.facturas_download (Promise<string>)
    // @ts-ignore: aceptar string o promise segun implementacion
    const url = await (api.facturas_img ? Promise.resolve(api.facturas_img(id)) : api.facturas_download(id))
    window.open(typeof url === 'string' ? url : String(url), '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      <h1>facturas</h1>

      {puedeSubir && (
        <div style={{marginBottom:8}}>
          <button className="btn" onClick={()=>setOpen(true)}>subir factura</button>
        </div>
      )}

      <div className="alert" style={{marginBottom:8}}>
        {verTodas ? 'viendo todas las facturas' : 'viendo mi historial'}
      </div>

      {loading ? (
        <div className="loading">cargando...</div>
      ) : rows.length === 0 ? (
        <div className="alert">no hay facturas</div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px,1fr))', gap:12}}>
          {rows.map(x=>(
            <div className="card" key={x.id}>
              <div style={{fontWeight:700, marginBottom:6}}>{x.descripcion || '(sin descripcion)'}</div>
              <div style={{fontSize:12, color:'#64748b', marginBottom:6}}>
                {x.fecha || '-'} {x.total!=null ? `· Q ${x.total}` : ''} {x.email ? `· ${x.email}` : ''}
              </div>
              <div style={{display:'flex', gap:8}}>
                <button className="btn" onClick={()=>abrirImagen(x.id)}>ver</button>
                {!verTodas && (
                  <button className="btn" onClick={()=>eliminar(x.id)}>eliminar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} title="subir factura" onClose={()=>setOpen(false)}
        actions={<>
          <button className="btn" onClick={subir} disabled={saving}>{saving?'subiendo...':'subir'}</button>
          <button className="linklike" onClick={()=>setOpen(false)}>cancelar</button>
        </>}>
        <div className="form">
          <label>imagen (jpg, png, heic, etc)</label>
          <input className="input" type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)} />
          <label>descripcion</label>
          <input className="input" value={f.descripcion} onChange={e=>setF({...f, descripcion:e.target.value})} />
          <label>total</label>
          <input className="input" type="number" step="0.01" value={f.total} onChange={e=>setF({...f, total:e.target.value})} />
          <label>fecha</label>
          <input className="input" type="date" value={f.fecha} onChange={e=>setF({...f, fecha:e.target.value})} />
        </div>
      </Modal>
    </div>
  )
}
