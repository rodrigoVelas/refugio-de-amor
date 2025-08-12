import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function Niveles(){
  const [rows, setRows] = useState<any[]>([])
  const [f, setF] = useState({ nombre: '', descripcion: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    return api.niveles_list().then(setRows)
  }

  useEffect(() => {
    void load()
  }, [])

  const crear = async (e: any) => {
    e.preventDefault()
    if (!f.nombre.trim()) return
    setSaving(true)
    try{
      await api.niveles_create({
        nombre: f.nombre.trim(),
        descripcion: f.descripcion.trim(),
      })
      setF({ nombre: '', descripcion: '' })
      await load()
    } finally {
      setSaving(false)
    }
  }

  const editar = async (id: string, current: any) => {
    const nombre = (prompt('nuevo nombre', current.nombre) ?? current.nombre).trim()
    const descripcion = (prompt('nueva descripcion', current.descripcion ?? '') ?? current.descripcion ?? '').trim()
    await api.niveles_update(id, { nombre, descripcion })
    await load()
  }

  const eliminar = async (id: string) => {
    if (!confirm('eliminar?')) return
    await api.niveles_delete(id)
    await load()
  }

  return (
    <div>
      <h1>niveles</h1>

      <form className="form" onSubmit={crear}>
        <input
          className="input"
          placeholder="nombre"
          value={f.nombre}
          onChange={(e) => setF({ ...f, nombre: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="descripcion"
          value={f.descripcion}
          onChange={(e) => setF({ ...f, descripcion: e.target.value })}
        />
        <button className="btn" disabled={saving}>{saving ? 'guardando...' : 'crear'}</button>
      </form>

      <table className="table" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>nombre</th>
            <th>descripcion</th>
            <th>acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any) => (
            <tr key={r.id}>
              <td>{r.nombre}</td>
              <td>{r.descripcion || '-'}</td>
              <td>
                <button className="btn" onClick={() => editar(r.id, r)}>editar</button>{' '}
                <button className="btn" onClick={() => eliminar(r.id)}>eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
