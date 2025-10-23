import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Modal from '../components/modal'

type Nivel = { id:string; nombre:string }
type Subnivel = { id:string; nivel_id:string; nombre:string; dias:string[]; horario?:string|null; nivel_nombre?:string }

function diasToString(d: string[] | null | undefined){
  return (d || []).join(', ')
}
function diasFromString(s: string){
  return s
    .split(',')
    .map(x => x.trim())
    .filter(Boolean)
}

export default function Subniveles(){
  const [rows, setRows] = useState<Subnivel[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [edit, setEdit] = useState<null | {
    id: string | null
    nivel_id: string
    nombre: string
    dias_txt: string
    horario: string
  }>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [subs, nivs] = await Promise.all([api.subniveles_list(), api.niveles_list()])
    setRows(subs)
    setNiveles(nivs)
  }

  useEffect(() => { void load() }, [])

  const abrirNuevo = () => setEdit({
    id: null,
    nivel_id: '',
    nombre: '',
    dias_txt: 'lunes, miercoles',
    horario: '14:00-16:00'
  })

  const abrirEditar = (s: Subnivel) => setEdit({
    id: s.id,
    nivel_id: s.nivel_id || '',
    nombre: s.nombre,
    dias_txt: diasToString(s.dias),
    horario: s.horario || ''
  })

  const cerrar = () => setEdit(null)

  const guardar = async () => {
    if (!edit) return
    if (!edit.nivel_id) { alert('Selecciona un nivel'); return }
    if (!edit.nombre.trim()) { alert('Ingresa el nombre del subnivel'); return }

    setSaving(true)
    try{
      const payload = {
        nivel_id: edit.nivel_id,
        nombre: edit.nombre.trim(),
        dias: diasFromString(edit.dias_txt),
        horario: edit.horario.trim() || null
      }
      if (edit.id){
        await api.subniveles_update(edit.id, payload)
      } else {
        await api.subniveles_create(payload)
      }
      setEdit(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async (id: string) => {
    if (!confirm('Eliminar subnivel?')) return
    await api.subniveles_delete(id)
    await load()
  }

  return (
    <div>
      <h1>Subniveles</h1>

      <div style={{display:'flex', gap:8, marginBottom:8}}>
        <button className="btn" onClick={abrirNuevo}>Nuevo subnivel</button>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Nivel</th>
            <th>Nombre</th>
            <th>Dias</th>
            <th>Horario</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(s => (
            <tr key={s.id}>
              <td>{s.nivel_nombre}</td>
              <td>{s.nombre}</td>
              <td>{diasToString(s.dias)}</td>
              <td>{s.horario || '-'}</td>
              <td>
                <button className="btn" onClick={() => abrirEditar(s)}>Editar</button>{' '}
                <button className="btn" onClick={() => eliminar(s.id)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal
        open={!!edit}
        title={edit?.id ? 'editar subnivel' : 'nuevo subnivel'}
        onClose={cerrar}
        actions={<>
          <button className="btn" onClick={guardar} disabled={saving}>
            {saving ? 'guardando...' : 'guardar'}
          </button>
          <button className="linklike" onClick={cerrar}>Cancelar</button>
        </>}
      >
        {edit && (
          <div className="form">
            <label>Nivel</label>
            <select
              className="input"
              value={edit.nivel_id}
              onChange={e => setEdit({ ...edit, nivel_id: e.target.value })}
              required
            >
              <option value="">Seleccionar nivel</option>
              {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>

            <label>Nombre del subnivel</label>
            <input
              className="input"
              value={edit.nombre}
              onChange={e => setEdit({ ...edit, nombre: e.target.value })}
              required
            />

            <label>Dias (separados por coma)</label>
            <input
              className="input"
              placeholder="lunes, miercoles"
              value={edit.dias_txt}
              onChange={e => setEdit({ ...edit, dias_txt: e.target.value })}
            />

            <label>Horario</label>
            <input
              className="input"
              placeholder="Ingrese el horario (ej: 14:00-17:00)"
              value={edit.horario}
              onChange={e => setEdit({ ...edit, horario: e.target.value })}
            />
          </div>
        )}
      </Modal>
    </div>
  )
}
