import { useState, useEffect } from 'react'
import { API_URL } from '../config'
import Swal from 'sweetalert2'

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
  colaborador_id: string
  codigo: string | null
  nombre_encargado: string | null
  telefono_encargado: string | null
  direccion_encargado: string | null
  colaborador_nombre: string
  nivel_nombre: string | null
  subnivel_nombre: string | null
}

export default function Ninos() {
  const [ninos, setNinos] = useState<Nino[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [subniveles, setSubniveles] = useState<Subnivel[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      setLoading(true)

      console.log('🔄 Cargando datos...')

      const [colabRes, nivRes, subRes, ninosRes] = await Promise.all([
        fetch(`${API_URL}/usuarios`, { credentials: 'include' }),
        fetch(`${API_URL}/niveles`, { credentials: 'include' }),
        fetch(`${API_URL}/subniveles`, { credentials: 'include' }),
        fetch(`${API_URL}/ninos?activo=true`, { credentials: 'include' })
      ])

      if (colabRes.ok) {
        const colabData = await colabRes.json()
        console.log('✅ Colaboradores cargados:', colabData.length)
        setColaboradores(colabData)
      }

      if (nivRes.ok) {
        const nivData = await nivRes.json()
        console.log('✅ Niveles cargados:', nivData.length)
        setNiveles(nivData)
      }

      if (subRes.ok) {
        const subData = await subRes.json()
        console.log('✅ Subniveles cargados:', subData)
        setSubniveles(subData)
      }

      if (ninosRes.ok) {
        const ninosData = await ninosRes.json()
        console.log('✅ Niños cargados:', ninosData.length)
        setNinos(ninosData)
      }
    } catch (error) {
      console.error('❌ Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  function abrirModal(nino?: Nino) {
    if (nino) {
      console.log('Editando niño:', nino)
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nombres.trim() || !apellidos.trim() || !fechaNacimiento || !colaboradorId) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor completa todos los campos requeridos',
        confirmButtonColor: '#3b82f6'
      })
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
        activo: true
      }

      console.log('📤 Enviando datos:', data)

      const url = editingId ? `${API_URL}/ninos/${editingId}` : `${API_URL}/ninos`
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: editingId ? '¡Actualizado!' : '¡Registrado!',
          text: `El niño ha sido ${editingId ? 'actualizado' : 'registrado'} correctamente`,
          timer: 2000,
          showConfirmButton: false
        })
        setShowModal(false)
        resetForm()
        cargarDatos()
      } else {
        const err = await res.json()
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error || 'Error al guardar',
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (error) {
      console.error('❌ Error guardando:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al guardar el niño',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleEliminar(id: string, nombre: string) {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Estás seguro?',
      text: `¿Deseas eliminar a ${nombre}?`,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`${API_URL}/ninos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: '¡Eliminado!',
          text: 'El niño ha sido eliminado correctamente',
          timer: 2000,
          showConfirmButton: false
        })
        cargarDatos()
      } else {
        const err = await res.json()
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error || 'Error al eliminar',
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al eliminar el niño',
        confirmButtonColor: '#3b82f6'
      })
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

  // Filtrar subniveles por nivel seleccionado
  const subnivelesFiltrados = subniveles.filter(s => s.nivel_id === nivelId)

  console.log('🔍 Nivel seleccionado:', nivelId)
  console.log('🔍 Todos los subniveles:', subniveles)
  console.log('🔍 Subniveles filtrados:', subnivelesFiltrados)

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Mis Niños Asignados</h1>
          <button className="btn" onClick={() => abrirModal()}>Registrar Niño</button>
        </div>

        <div className="card-content">
          {loading ? (
            <div className="loading">Cargando...</div>
          ) : ninos.length === 0 ? (
            <div className="alert">No tienes niños asignados</div>
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
                    {nino.subnivel_nombre && <div>Subnivel: {nino.subnivel_nombre}</div>}
                    {nino.nombre_encargado && <div>Encargado: {nino.nombre_encargado}</div>}
                    {nino.telefono_encargado && <div>Tel: {nino.telefono_encargado}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost" onClick={() => abrirModal(nino)} style={{ flex: 1 }}>Editar</button>
                    <button className="btn btn-danger" onClick={() => handleEliminar(nino.id, `${nino.nombres} ${nino.apellidos}`)} style={{ flex: 1 }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
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
                <div><label className="label">Fecha de Nacimiento*</label><input type="date" className="input" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} required /></div>
                <div><label className="label">Código</label><input className="input" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Opcional" /></div>
              </div>
              <div><label className="label">Asignar a Colaborador*</label>
                <select className="select" value={colaboradorId} onChange={e => setColaboradorId(e.target.value)} required>
                  <option value="">Selecciona un colaborador</option>
                  {colaboradores.map(c => <option key={c.id} value={c.id}>{c.nombres} {c.apellidos || ''}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Nivel (Opcional)</label>
                  <select 
                    className="select" 
                    value={nivelId} 
                    onChange={e => {
                      console.log('Nivel cambiado a:', e.target.value)
                      setNivelId(e.target.value)
                      setSubnivelId('') // Reset subnivel
                    }}
                  >
                    <option value="">Ninguno</option>
                    {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Subnivel (Opcional)</label>
                  <select 
                    className="select" 
                    value={subnivelId} 
                    onChange={e => {
                      console.log('Subnivel cambiado a:', e.target.value)
                      setSubnivelId(e.target.value)
                    }} 
                    disabled={!nivelId || subnivelesFiltrados.length === 0}
                  >
                    <option value="">Ninguno</option>
                    {subnivelesFiltrados.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                  {nivelId && subnivelesFiltrados.length === 0 && (
                    <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                      No hay subniveles para este nivel
                    </small>
                  )}
                </div>
              </div>
              <div><label className="label">Nombre del Encargado</label><input className="input" value={nombreEncargado} onChange={e => setNombreEncargado(e.target.value)} placeholder="Opcional" /></div>
              <div><label className="label">Teléfono del Encargado</label><input className="input" value={telefonoEncargado} onChange={e => setTelefonoEncargado(e.target.value)} placeholder="Opcional" /></div>
              <div><label className="label">Dirección del Encargado</label><textarea className="textarea" value={direccionEncargado} onChange={e => setDireccionEncargado(e.target.value)} rows={2} placeholder="Opcional" /></div>
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