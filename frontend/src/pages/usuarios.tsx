import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/modal'
import { can } from '../lib/permissions'

type UserRow = { id:string; email:string; nombres:string; apellidos:string; roles?:string[] }
type Rol = { id:string; nombre:string; codigo:number|null }

export default function Usuarios(){
  const [rows,setRows] = useState<UserRow[]>([])
  const [roles,setRoles] = useState<Rol[]>([])
  const [me,setMe] = useState<any>(null)
  const [q,setQ] = useState('')

  const [edit,setEdit] = useState<null | {
    id: string | null
    email: string
    nombres: string
    apellidos: string
    password: string
    role: string
  }>(null)
  const [saving,setSaving] = useState(false)

  const puedeEditar = can(me, ['crud_usuarios'])

  const load = async ()=>{
    const u = await api.me()
    setMe(u)
    const list = await api.usuarios_list()
    setRows(list)
    // usa api.roles_list si la tienes; si no, toma estatico:
    try{
      const data = await api.roles_list()
      setRoles(data.roles)
    }catch{
      setRoles([{id:'',nombre:'directora',codigo:1},{id:'',nombre:'contabilidad',codigo:2},{id:'',nombre:'colaboradores',codigo:3}])
    }
  }

  useEffect(()=>{ void load() },[])

  const abrirNuevo = ()=>{
    setEdit({ id:null, email:'', nombres:'', apellidos:'', password:'demo123', role:'colaboradores' })
  }
  const abrirEditar = (u:UserRow)=>{
    // al editar, password vacio (opcional); si lo llenan, se cambia
    const roleActual = (u.roles && u.roles[0]) || 'colaboradores'
    setEdit({ id:u.id, email:u.email, nombres:u.nombres||'', apellidos:u.apellidos||'', password:'', role:roleActual })
  }
  const cerrar = ()=> setEdit(null)

  const guardar = async ()=>{
    if (!edit) return
    if (!edit.email.trim() || !edit.nombres.trim() || !edit.apellidos.trim()) { alert('completa email, nombres y apellidos'); return }
    setSaving(true)
    try{
      if (edit.id){
        await api.usuarios_update(edit.id, {
          email: edit.email.trim(),
          nombres: edit.nombres.trim(),
          apellidos: edit.apellidos.trim(),
          password: edit.password ? edit.password : undefined,
          role: edit.role
        })
      } else {
        await api.usuarios_create({
          email: edit.email.trim(),
          nombres: edit.nombres.trim(),
          apellidos: edit.apellidos.trim(),
          password: edit.password || 'demo123',
          role: edit.role
        })
      }
      setEdit(null)
      await load()
    } finally { setSaving(false) }
  }

  const eliminar = async (id:string)=>{
    if (!puedeEditar) return
    if (!confirm('eliminar usuario?')) return
    await api.usuarios_delete(id)
    await load()
  }

  const filtered = rows.filter(r =>
    !q.trim()
    || (r.email?.toLowerCase().includes(q.toLowerCase()))
    || (r.nombres?.toLowerCase().includes(q.toLowerCase()))
    || (r.apellidos?.toLowerCase().includes(q.toLowerCase()))
  )

  return (
    <div>
      <h1>usuarios</h1>

      <div style={{display:'flex', gap:8, marginBottom:8}}>
        <input className="input" placeholder="buscar por nombre o email" value={q} onChange={e=>setQ(e.target.value)} />
        {puedeEditar && <button className="btn" onClick={abrirNuevo}>Nuevo usuario</button>}
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Email</th>
            <th>Nombres</th>
            <th>Apellidos</th>
            <th>Roles</th>
            {puedeEditar && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {filtered.map(u=>(
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.nombres}</td>
              <td>{u.apellidos}</td>
              <td>{(u.roles||[]).join(', ')}</td>
              {puedeEditar && (
                <td>
                  <button className="btn" onClick={()=>abrirEditar(u)}>Editar</button>{' '}
                  <button className="btn" onClick={()=>eliminar(u.id)}>Eliminar</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={!!edit}
        title={edit?.id ? 'editar usuario' : 'nuevo usuario'}
        onClose={cerrar}
        actions={<>
          <button className="btn" onClick={guardar} disabled={saving}>{saving?'guardando...':'guardar'}</button>
          <button className="linklike" onClick={cerrar}>Cancelar</button>
        </>}
      >
        {edit && (
          <div className="form">
            <label>Email</label>
            <input className="input" value={edit.email} onChange={e=>setEdit({...edit, email:e.target.value})} required />

            <label>Nombres</label>
            <input className="input" value={edit.nombres} onChange={e=>setEdit({...edit, nombres:e.target.value})} required />

            <label>Apellidos</label>
            <input className="input" value={edit.apellidos} onChange={e=>setEdit({...edit, apellidos:e.target.value})} required />

            <label>Contraseña</label>
            <input className="input" type="password" value={edit.password} onChange={e=>setEdit({...edit, password:e.target.value})} placeholder="********" />

            <label>rol</label>
            <select className="input" value={edit.role} onChange={e=>setEdit({...edit, role:e.target.value})}>
              {(roles.length ? roles.map(r => r.nombre) : ['directora','contabilidad','colaboradores']).map(rn =>
                <option key={rn} value={rn}>{rn}</option>
              )}
            </select>
          </div>
        )}
      </Modal>
    </div>
  )
}
