import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function Usuarios(){
  const [rows,setRows] = useState<any[]>([])
  const [f,setF] = useState({email:'',nombres:'',apellidos:'',password:'demo123',role:'colaboradores'})

  const load = () => {
    api.usuarios_list().then(setRows)
  }

  useEffect(() => {
    load()              // o: void load()
  }, [])

  const crear = async (e:any) => {
    e.preventDefault()
    await api.usuarios_create(f)
    setF({email:'',nombres:'',apellidos:'',password:'demo123',role:'colaboradores'})
    load()
  }

  const cambiarRol = async (id:string) => {
    const role = prompt('rol (directora, contabilidad, colaboradores)','colaboradores') || 'colaboradores'
    await api.usuarios_update(id,{ role })
    load()
  }

  return (
    <div>
      <h1>usuarios</h1>
      <form className="form" onSubmit={crear}>
        <input className="input" placeholder="Correo" value={f.email} onChange={e=>setF({...f,email:e.target.value})} required/>
        <input className="input" placeholder="Nombres" value={f.nombres} onChange={e=>setF({...f,nombres:e.target.value})} required/>
        <input className="input" placeholder="Apellidos" value={f.apellidos} onChange={e=>setF({...f,apellidos:e.target.value})} required/>
        <input className="input" type="password" placeholder="Contraseña" value={f.password} onChange={e=>setF({...f,password:e.target.value})} />
        <input className="input" placeholder="rol (directora, contabilidad, colaboradores)" value={f.role} onChange={e=>setF({...f,role:e.target.value})} />
        <button className="btn">Crear usuario</button>
      </form>

      <table className="table" style={{marginTop:12}}>
        <thead><tr><th>Correo</th><th>Nombres</th><th>Apellidos</th><th>Roles</th><th>Acciones</th></tr></thead>
        <tbody>
          {rows.map((u:any)=>(
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.nombres}</td>
              <td>{u.apellidos}</td>
              <td>{(u.roles||[]).join(', ')}</td>
              <td>
                <button className="btn" onClick={()=>cambiarRol(u.id)}>Cambiar rol</button>{' '}
                <button className="btn" onClick={async()=>{ if(confirm('eliminar?')){ await api.usuarios_delete(u.id); load() } }}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
