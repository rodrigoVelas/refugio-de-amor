import { useState, useEffect } from 'react'
import { API_URL } from '../config'

interface Colaborador {
  id: string
  nombres: string
  apellidos: string
}

interface Nino {
  id: string
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  genero: string
  colaborador_id: string
  estado: string
  fecha_ingreso: string
  colaborador_nombre: string
}

export default function Ninos() {
  const [ninos, setNinos] = useState<Nino[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Filtros
  const [filtroColaborador, setFiltroColaborador] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Form state
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [genero, setGenero] = useState('M')
  const [colaboradorId, setColaboradorId] = useState('')
  const [estado, setEstado] = useState('activo')
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    cargarDatos()
  }, [filtroColaborador, filtroEstado])

  async function cargarDatos() {
    try {
      setLoading(true)

      // Cargar colaboradores (usuarios)
      const colaboradoresRes = await fetch(`${API_URL}/usuarios`, { credentials: 'include' })
      if (colaboradoresRes.ok) {
        const colaboradoresData = await colaboradoresRes.json()
        setColaboradores(colaboradoresData)
      }

      // Cargar niños con filtros
      const params = new URLSearchParams()
      if (filtroColaborador) params.append('colaborador_id', filtroColaborador)
      if (filtroEstado) params.append('estado', filtroEstado)

      const ninosUrl = `${API_URL}/ninos${params.toString() ? '?' + params.toString() : ''}`
      const ninosRes = await fetch(ninosUrl, { credentials: 'include' })
      
      if (ninosRes.ok) {
        setNinos(await ninosRes.json())
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  function abrirModal(nino?: Nino) {
    if (nino) {
      setEditingId(nino.id)
      setNombres(nino.nombres)
      setApellidos(nino.apellidos)
      setFechaNacimiento(nino.fecha_nacimiento)
      setGenero(nino.genero)
      setColaboradorId(nino.colaborador_id)
      setEstado(nino.estado)
      setFechaIngreso(nino.fecha_ingreso)
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  function resetForm() {
    setEditingId(null)
    setNombres('')
    setApellidos('')
    setFechaNacimiento('')
    setGenero('M')
    setColaboradorId('')
    setEstado('activo')
    setFechaIngreso(new Date().toISOString().split('T')[0])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nombres.trim() || !apellidos.trim() || !fechaNacimiento || !colaboradorId) {
      alert('Completa todos los campos')
      return
    }

    try {
      setSaving(true)

      const url = editingId ? `${API_URL}/ninos/${editingId}` : `${API_URL}/ninos`
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombres,
          apellidos,
          fecha_nacimiento: fechaNacimiento,
          genero,
          colaborador_id: colaboradorId,
          estado,
          fecha_ingreso: fechaIngreso,
        }),
      })

      if (res.ok) {
        alert(editingId ? 'Actualizado' : 'Registrado')
        setShowModal(false)
        resetForm()
        cargarDatos()
      } else {
        const data = await res.json()
        alert(data.error || 'Error')
      }
    } catch (error) {
      alert('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Eliminar este niño?')) return

    try {
      const res = await fetch(`${API_URL}/ninos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        alert('Eliminado')
        cargarDatos()
      } else {
        alert('Error al eliminar')
      }
    } catch (error) {
      alert('Error al eliminar')
    }
  }

  function calcularEdad(fechaNac: string): number {
    const hoy = new Date()
    const nac = new Date(fechaNac)
    let edad = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
    return edad
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Niños</h1>
          <button className="btn" onClick={() => abrirModal()}>Registrar</button>
        </div>

        <div className="toolbar">
          <select className="select" value={filtroColaborador} onChange={(e) => setFiltroColaborador(e.target.value)}>
            <option value="">Todos los colaboradores</option>
            {colaboradores.map(c => (
              <option key={c.id} value={c.id}>
                {c.nombres} {c.apellidos || ''}
              </option>
            ))}
          </select>

          <select className="select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="egresado">Egresados</option>
          </select>

          {(filtroColaborador || filtroEstado) && (
            <button className="btn btn-ghost" onClick={() => { setFiltroColaborador(''); setFiltroEstado('') }}>
              Limpiar
            </button>
          )}
        </div>

        <div className="card-content">
          {loading ? (
            <div className="loading">Cargando...</div>
          ) : ninos.length === 0 ? (
            <div className="alert">No hay niños</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {ninos.map(nino => (
                <div key={nino.id} style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <h3 style={{ marginBottom: '0.5rem' }}>{nino.nombres} {nino.apellidos}</h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    <div>Edad: {calcularEdad(nino.fecha_nacimiento)} años</div>
                    <div>{nino.genero === 'M' ? 'Masculino' : 'Femenino'}</div>
                    <div>Colaborador: {nino.colaborador_nombre}</div>
                    <div>Estado: <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', background: nino.estado === 'activo' ? '#dcfce7' : '#fee2e2', color: nino.estado === 'activo' ? '#166534' : '#991b1b' }}>{nino.estado}</span></div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost" onClick={() => abrirModal(nino)} style={{ flex: 1 }}>Editar</button>
                    <button className="btn btn-danger" onClick={() => handleEliminar(nino.id)} style={{ flex: 1 }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar' : 'Registrar'} Niño</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Nombres*</label><input className="input" value={nombres} onChange={e => setNombres(e.target.value)} required /></div>
                <div><label className="label">Apellidos*</label><input className="input" value={apellidos} onChange={e => setApellidos(e.target.value)} required /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Fecha Nac*</label><input type="date" className="input" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} required /></div>
                <div><label className="label">Género*</label><select className="select" value={genero} onChange={e => setGenero(e.target.value)}><option value="M">Masculino</option><option value="F">Femenino</option></select></div>
              </div>
              <div>
                <label className="label">Asignar a Colaborador*</label>
                <select className="select" value={colaboradorId} onChange={e => setColaboradorId(e.target.value)} required>
                  <option value="">Selecciona un colaborador</option>
                  {colaboradores.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombres} {c.apellidos || ''}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Estado*</label><select className="select" value={estado} onChange={e => setEstado(e.target.value)}><option value="activo">Activo</option><option value="inactivo">Inactivo</option><option value="egresado">Egresado</option></select></div>
                <div><label className="label">Fecha Ingreso*</label><input type="date" className="input" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} required /></div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>Cancelar</button>
                <button type="submit" className="btn" disabled={saving}>{saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Registrar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}