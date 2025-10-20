import { useState, useEffect } from 'react'
import { API_URL } from '../config'

interface Colaborador {
  id: string
  nombres: string
  apellidos: string
}

interface Nivel {
  id: string
  nombre: string
}

interface Subnivel {
  id: string
  nombre: string
  nivel_id: string
}

interface Nino {
  id: string
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  nivel_id: string | null
  subnivel_id: string | null
  maestro_id: string | null
  colaborador_id: string
  activo: boolean
  codigo: string | null
  nombre_encargado: string | null
  telefono_encargado: string | null
  direccion_encargado: string | null
  fecha_baja: string | null
  colaborador_nombre: string
  nivel_nombre: string | null
  subnivel_nombre: string | null
}

export default function Ninos() {
  const [ninos, setNinos] = useState<Nino[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [subniveles, setSubniveles] = useState<Subnivel[]>([])
  const [filteredSubniveles, setFilteredSubniveles] = useState<Subnivel[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Filtros
  const [filtroColaborador, setFiltroColaborador] = useState('')
  const [filtroActivo, setFiltroActivo] = useState('')

  // Form state
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [nivelId, setNivelId] = useState('')
  const [subnivelId, setSubnivelId] = useState('')
  const [colaboradorId, setColaboradorId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nombreEncargado, setNombreEncargado] = useState('')
  const [telefonoEncargado, setTelefonoEncargado] = useState('')
  const [direccionEncargado, setDireccionEncargado] = useState('')
  const [activo, setActivo] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [filtroColaborador, filtroActivo])

  useEffect(() => {
    if (nivelId) {
      const subs = subniveles.filter(s => s.nivel_id === nivelId)
      setFilteredSubniveles(subs)
      if (!subs.find(s => s.id === subnivelId)) {
        setSubnivelId('')
      }
    } else {
      setFilteredSubniveles([])
      setSubnivelId('')
    }
  }, [nivelId, subniveles, subnivelId])

  async function cargarDatos() {
    try {
      setLoading(true)

      // Cargar colaboradores
      const colabRes = await fetch(`${API_URL}/usuarios`, { credentials: 'include' })
      if (colabRes.ok) setColaboradores(await colabRes.json())

      // Cargar niveles
      const nivRes = await fetch(`${API_URL}/niveles`, { credentials: 'include' })
      if (nivRes.ok) setNiveles(await nivRes.json())

      // Cargar subniveles
      const subRes = await fetch(`${API_URL}/subniveles`, { credentials: 'include' })
      if (subRes.ok) setSubniveles(await subRes.json())

      // Cargar niños
      const params = new URLSearchParams()
      if (filtroColaborador) params.append('colaborador_id', filtroColaborador)
      if (filtroActivo) params.append('activo', filtroActivo)

      const ninosUrl = `${API_URL}/ninos${params.toString() ? '?' + params.toString() : ''}`
      const ninosRes = await fetch(ninosUrl, { credentials: 'include' })
      
      if (ninosRes.ok) setNinos(await ninosRes.json())
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
      setNivelId(nino.nivel_id || '')
      setSubnivelId(nino.subnivel_id || '')
      setColaboradorId(nino.colaborador_id)
      setCodigo(nino.codigo || '')
      setNombreEncargado(nino.nombre_encargado || '')
      setTelefonoEncargado(nino.telefono_encargado || '')
      setDireccionEncargado(nino.direccion_encargado || '')
      setActivo(nino.activo)
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
    setNivelId('')
    setSubnivelId('')
    setColaboradorId('')
    setCodigo('')
    setNombreEncargado('')
    setTelefonoEncargado('')
    setDireccionEncargado('')
    setActivo(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nombres.trim() || !apellidos.trim() || !fechaNacimiento || !colaboradorId) {
      alert('Completa todos los campos requeridos')
      return
    }

    try {
      setSaving(true)

      const data = {
        nombres,
        apellidos,
        fecha_nacimiento: fechaNacimiento,
        nivel_id: nivelId || null,
        subnivel_id: subnivelId || null,
        colaborador_id: colaboradorId,
        codigo: codigo || null,
        nombre_encargado: nombreEncargado || null,
        telefono_encargado: telefonoEncargado || null,
        direccion_encargado: direccionEncargado || null,
        activo
      }

      const url = editingId ? `${API_URL}/ninos/${editingId}` : `${API_URL}/ninos`
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        alert(editingId ? 'Actualizado' : 'Registrado')
        setShowModal(false)
        resetForm()
        cargarDatos()
      } else {
        const err = await res.json()
        alert(err.error || 'Error')
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
              <option key={c.id} value={c.id}>{c.nombres} {c.apellidos || ''}</option>
            ))}
          </select>

          <select className="select" value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)}>
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>

          {(filtroColaborador || filtroActivo) && (
            <button className="btn btn-ghost" onClick={() => { setFiltroColaborador(''); setFiltroActivo('') }}>Limpiar</button>
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
                    {nino.codigo && <div>Código: {nino.codigo}</div>}
                    <div>Colaborador: {nino.colaborador_nombre}</div>
                    {nino.nivel_nombre && <div>Nivel: {nino.nivel_nombre}</div>}
                    {nino.nombre_encargado && <div>Encargado: {nino.nombre_encargado}</div>}
                    <div>Estado: <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', background: nino.activo ? '#dcfce7' : '#fee2e2', color: nino.activo ? '#166534' : '#991b1b' }}>{nino.activo ? 'Activo' : 'Inactivo'}</span></div>
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
                <div><label className="label">Código</label><input className="input" value={codigo} onChange={e => setCodigo(e.target.value)} /></div>
              </div>
              <div><label className="label">Colaborador*</label>
                <select className="select" value={colaboradorId} onChange={e => setColaboradorId(e.target.value)} required>
                  <option value="">Selecciona</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos || ''}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Nivel</label>
                  <select className="select" value={nivelId} onChange={e => setNivelId(e.target.value)}>
                    <option value="">Ninguno</option>
                    {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                  </select>
                </div>
                <div><label className="label">Subnivel</label>
                  <select className="select" value={subnivelId} onChange={e => setSubnivelId(e.target.value)} disabled={!nivelId}>
                    <option value="">Ninguno</option>
                    {filteredSubniveles.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div><label className="label">Nombre Encargado</label><input className="input" value={nombreEncargado} onChange={e => setNombreEncargado(e.target.value)} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div><label className="label">Teléfono Encargado</label><input className="input" value={telefonoEncargado} onChange={e => setTelefonoEncargado(e.target.value)} /></div>
                <div><label className="label">Estado</label>
                  <select className="select" value={activo ? 'true' : 'false'} onChange={e => setActivo(e.target.value === 'true')}>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
              </div>
              <div><label className="label">Dirección Encargado</label><textarea className="textarea" value={direccionEncargado} onChange={e => setDireccionEncargado(e.target.value)} rows={2} /></div>
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