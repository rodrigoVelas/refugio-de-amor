import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function Ninos() {
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [f, setF] = useState({
    codigo: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    nombre_encargado: '',
    telefono_encargado: '',
    direccion_encargado: ''
  })
  const [editItem, setEditItem] = useState<any|null>(null)

  const load = async () => {
    const data = await api.ninos_list(q)
    setRows(data)
  }

  useEffect(() => { load() }, [q])

  const saveNuevo = async (e:any) => {
    e.preventDefault()
    await api.ninos_create(f)
    setF({
      codigo: '',
      nombres: '',
      apellidos: '',
      fecha_nacimiento: '',
      nombre_encargado: '',
      telefono_encargado: '',
      direccion_encargado: ''
    })
    setShowForm(false)
    load()
  }

  const saveEditar = async (e:any) => {
    e.preventDefault()
    if (!editItem) return
    await api.ninos_update(editItem.id, editItem)
    setEditItem(null)
    load()
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Niños</h1>

      {/* Buscar */}
      <div className="form" style={{marginTop:12, maxWidth:400}}>
        <input
          className="input"
          placeholder="Buscar por código o nombre"
          value={q}
          onChange={e=>setQ(e.target.value)}
        />
      </div>

      {/* Botón para abrir formulario */}
      <div style={{marginTop:16}}>
        <button className="btn" onClick={()=>setShowForm(true)}>
          + Nuevo niño
        </button>
      </div>

      {/* Formulario modal para crear */}
      {showForm && (
        <div className="modal">
          <div className="card" style={{maxWidth:500}}>
            <h2 className="font-bold">Nuevo niño</h2>
            <form className="form" onSubmit={saveNuevo}>
              <input
                className="input"
                placeholder="Código"
                value={f.codigo}
                onChange={e=>setF({...f, codigo:e.target.value})}
                required
              />
              <input
                className="input"
                placeholder="Nombres"
                value={f.nombres}
                onChange={e=>setF({...f, nombres:e.target.value})}
                required
              />
              <input
                className="input"
                placeholder="Apellidos"
                value={f.apellidos}
                onChange={e=>setF({...f, apellidos:e.target.value})}
                required
              />
              <input
                type="date"
                className="input"
                value={f.fecha_nacimiento}
                onChange={e=>setF({...f, fecha_nacimiento:e.target.value})}
              />
              <input
                className="input"
                placeholder="Nombre del encargado"
                value={f.nombre_encargado}
                onChange={e=>setF({...f, nombre_encargado:e.target.value})}
              />
              <input
                className="input"
                placeholder="Teléfono del encargado"
                value={f.telefono_encargado}
                onChange={e=>setF({...f, telefono_encargado:e.target.value})}
              />
              <input
                className="input"
                placeholder="Dirección del encargado"
                value={f.direccion_encargado}
                onChange={e=>setF({...f, direccion_encargado:e.target.value})}
              />
              <div className="flex">
                <button className="btn">Crear</button>
                <button type="button" className="btn" onClick={()=>setShowForm(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla */}
      <table className="table" style={{marginTop:16}}>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Fecha nac.</th>
            <th>Encargado</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id}>
              <td>{r.codigo}</td>
              <td>{r.nombres} {r.apellidos}</td>
              <td>{r.fecha_nacimiento || '-'}</td>
              <td>{r.nombre_encargado || '-'}</td>
              <td>{r.telefono_encargado || '-'}</td>
              <td>{r.direccion_encargado || '-'}</td>
              <td>
                <button className="btn" onClick={()=>setEditItem(r)}>Editar</button>{' '}
                <button className="btn" onClick={async()=>{
                  if (confirm('¿Eliminar este niño?')) {
                    await api.ninos_delete(r.id)
                    load()
                  }
                }}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal editar */}
      {editItem && (
        <div className="modal">
          <div className="card" style={{maxWidth:500}}>
            <h2 className="font-bold">Editar niño</h2>
            <form className="form" onSubmit={saveEditar}>
              <input
                className="input"
                placeholder="Código"
                value={editItem.codigo || ''}
                onChange={e=>setEditItem({...editItem, codigo:e.target.value})}
                required
              />
              <input
                className="input"
                placeholder="Nombres"
                value={editItem.nombres || ''}
                onChange={e=>setEditItem({...editItem, nombres:e.target.value})}
                required
              />
              <input
                className="input"
                placeholder="Apellidos"
                value={editItem.apellidos || ''}
                onChange={e=>setEditItem({...editItem, apellidos:e.target.value})}
                required
              />
              <input
                type="date"
                className="input"
                value={editItem.fecha_nacimiento || ''}
                onChange={e=>setEditItem({...editItem, fecha_nacimiento:e.target.value})}
              />
              <input
                className="input"
                placeholder="Nombre del encargado"
                value={editItem.nombre_encargado || ''}
                onChange={e=>setEditItem({...editItem, nombre_encargado:e.target.value})}
              />
              <input
                className="input"
                placeholder="Teléfono del encargado"
                value={editItem.telefono_encargado || ''}
                onChange={e=>setEditItem({...editItem, telefono_encargado:e.target.value})}
              />
              <input
                className="input"
                placeholder="Dirección del encargado"
                value={editItem.direccion_encargado || ''}
                onChange={e=>setEditItem({...editItem, direccion_encargado:e.target.value})}
              />
              <div className="flex">
                <button className="btn">Guardar</button>
                <button type="button" className="btn" onClick={()=>setEditItem(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
