import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type Rol = { id:string; nombre:string; codigo:number|null; permisos:string[] }

export default function Roles(){
  const [roles, setRoles] = useState<Rol[]>([])
  const [perms, setPerms] = useState<{id:string; clave:string}[]>([])
  const [f, setF] = useState({ nombre:'', codigo:'' })
  const [sel, setSel] = useState<Rol | null>(null)

  const load = async () => {
    const d = await api.roles_list()
    setRoles(d.roles)
    setPerms(d.permisos)
    if (d.roles.length && !sel) setSel(d.roles[0])
  }

  useEffect(()=>{ void load() }, [])

  const crear = async (e:any) => {
    e.preventDefault()
    const data:any = { nombre: f.nombre.trim() }
    if (f.codigo) data.codigo = Number(f.codigo)
    await api.roles_create(data)
    setF({ nombre:'', codigo:'' })
    await load()
  }

  const guardarPermisos = async () => {
    if (!sel) return
    await api.roles_set_perms(sel.id, sel.permisos)
    alert('permisos guardados')
  }

  const eliminar = async (id:string) => {
    if (!confirm('eliminar rol?')) return
    await api.roles_delete(id)
    setSel(null)
    await load()
  }

  return (
    <div className="grid" style={{gap:12}}>
      <h1>roles</h1>

      <div className="card" style={{display:'grid', gap:8}}>
        <form className="form" onSubmit={crear}>
          <input className="input" placeholder="nombre del rol" value={f.nombre} onChange={e=>setF({...f, nombre:e.target.value})} required />
          <input className="input" placeholder="codigo (opcional)" value={f.codigo} onChange={e=>setF({...f, codigo:e.target.value})} />
          <button className="btn">crear rol</button>
        </form>
      </div>

      <div className="grid" style={{display:'grid', gridTemplateColumns:'280px 1fr', gap:12}}>
        <div className="card">
          <h2 style={{fontWeight:700, marginBottom:8}}>lista de roles</h2>
          <ul>
            {roles.map(r=>(
              <li key={r.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0'}}>
                <button className="linklike" onClick={()=> setSel(r)}>{r.codigo ?? '-'} · {r.nombre}</button>
                <button className="btn" onClick={()=> eliminar(r.id)}>eliminar</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <h2 style={{fontWeight:700, marginBottom:8}}>permisos del rol</h2>
          {!sel ? <div>selecciona un rol</div> : (
            <>
              <div className="alert" style={{marginBottom:8}}>
                rol: <b>{sel.nombre}</b> (codigo: {sel.codigo ?? '-'})
              </div>

              <div className="grid" style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8}}>
                {perms.map(p=>{
                  const checked = sel.permisos?.includes(p.clave)
                  return (
                    <label key={p.id} style={{display:'flex', gap:6, alignItems:'center', border:'1px solid #eee', padding:'6px 8px', borderRadius:8}}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e)=>{
                          const next = new Set(sel.permisos || [])
                          if (e.target.checked) next.add(p.clave); else next.delete(p.clave)
                          setSel({ ...sel, permisos: Array.from(next) })
                        }}
                      />
                      <span>{p.clave}</span>
                    </label>
                  )
                })}
              </div>

              <div style={{marginTop:12}}>
                <button className="btn" onClick={guardarPermisos}>guardar permisos</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
