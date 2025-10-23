import { useState, useEffect } from 'react'
import { API_URL } from '../config'
import Swal from 'sweetalert2'

interface Maestro {
  id: string
  nombres: string
  apellidos: string
}

interface Nivel {
  id: string
  nombre: string
}

interface Nino {
  id: string
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  nivel_id: string | null
  maestro_id: string
  codigo: string | null
  nombre_encargado: string | null
  telefono_encargado: string | null
  direccion_encargado: string | null
  maestro_nombre: string
  maestro_email: string
  nivel_nombre: string | null
}

export default function Ninos() {
  const [ninos, setNinos] = useState<Nino[]>([])
  const [maestros, setMaestros] = useState<Maestro[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Búsqueda
  const [busqueda, setBusqueda] = useState('')

  // Form state
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [nivelId, setNivelId] = useState('')
  const [maestroId, setMaestroId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nombreEncargado, setNombreEncargado] = useState('')
  const [telefonoEncargado, setTelefonoEncargado] = useState('')
  const [direccionEncargado, setDireccionEncargado] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [busqueda])

  async function cargarDatos() {
    try {
      setLoading(true)

      const [maestrosRes, nivRes] = await Promise.all([
        fetch(`${API_URL}/usuarios`, { credentials: 'include' }),
        fetch(`${API_URL}/niveles`, { credentials: 'include' })
      ])

      if (maestrosRes.ok) setMaestros(await maestrosRes.json())
      if (nivRes.ok) setNiveles(await nivRes.json())

      const params = new URLSearchParams()
      if (busqueda.trim()) params.append('buscar', busqueda.trim())

      const ninosUrl = `${API_URL}/ninos?${params.toString()}`
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
      // Extraer solo la fecha (YYYY-MM-DD) sin la parte del tiempo
      const fechaSolo = nino.fecha_nacimiento.split('T')[0]
      setFechaNacimiento(fechaSolo)
      setNivelId(nino.nivel_id || '')
      setMaestroId(nino.maestro_id)
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
    setMaestroId('')
    setCodigo('')
    setNombreEncargado('')
    setTelefonoEncargado('')
    setDireccionEncargado('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nombres.trim() || !apellidos.trim() || !fechaNacimiento || !maestroId) {
      Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Completa nombres, apellidos, fecha de nacimiento y maestro',
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
        subnivel_id: null, // Siempre null por ahora
        maestro_id: maestroId,
        codigo: codigo || null,
        nombre_encargado: nombreEncargado || null,
        telefono_encargado: telefonoEncargado || null,
        direccion_encargado: direccionEncargado || null
      }

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
          text: err.error,
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al guardar',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleEliminar(id: string, nombre: string) {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar?',
      text: `¿Eliminar a ${nombre}?`,
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
          timer: 2000,
          showConfirmButton: false
        })
        cargarDatos()
      } else {
        const err = await res.json()
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error,
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al eliminar',
        confirmButtonColor: '#3b82f6'
      })
    }
  }

  function calcularEdad(fechaNac: string): number {
    const hoy = new Date()
    // Extraer solo la parte de la fecha (sin tiempo)
    const fechaSolo = fechaNac.split('T')[0]
    const [año, mes, dia] = fechaSolo.split('-').map(Number)
    const nac = new Date(año, mes - 1, dia)
    
    let edad = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
    return edad
  }

  function formatearFecha(fecha: string): string {
    // Extraer solo la parte de la fecha (antes de la T)
    const fechaSolo = fecha.split('T')[0]
    const [año, mes, dia] = fechaSolo.split('-')
    return `${dia}/${mes}/${año}`
  }

  function esCumpleañeroDelMes(fechaNac: string): boolean {
    const hoy = new Date()
    const fechaSolo = fechaNac.split('T')[0]
    const [año, mes, dia] = fechaSolo.split('-').map(Number)
    const nac = new Date(año, mes - 1, dia)
    return nac.getMonth() === hoy.getMonth()
  }

  function diasParaCumple(fechaNac: string): number {
    const hoy = new Date()
    const fechaSolo = fechaNac.split('T')[0]
    const [año, mes, dia] = fechaSolo.split('-').map(Number)
    const nac = new Date(año, mes - 1, dia)
    const cumpleEsteAño = new Date(hoy.getFullYear(), nac.getMonth(), nac.getDate())
    
    if (cumpleEsteAño < hoy) {
      cumpleEsteAño.setFullYear(hoy.getFullYear() + 1)
    }
    
    const diff = cumpleEsteAño.getTime() - hoy.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // Filtrar cumpleañeros del mes
  const cumpleañerosDelMes = ninos
    .filter(nino => esCumpleañeroDelMes(nino.fecha_nacimiento))
    .sort((a, b) => {
      const fechaA = a.fecha_nacimiento.split('T')[0]
      const fechaB = b.fecha_nacimiento.split('T')[0]
      const diaA = new Date(fechaA).getDate()
      const diaB = new Date(fechaB).getDate()
      return diaA - diaB
    })

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Niños Asignados</h1>
          <button className="btn" onClick={() => abrirModal()}>
            Registrar Niño
          </button>
        </div>

        {/* Buscador */}
        <div className="toolbar">
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
              🔍
            </span>
            <input
              type="text"
              className="input"
              placeholder="Buscar por código, nombre o apellido..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>
          {busqueda && (
            <button className="btn btn-ghost" onClick={() => setBusqueda('')}>
              Limpiar
            </button>
          )}
        </div>

        <div className="card-content">
          {loading ? (
            <div className="loading">Cargando...</div>
          ) : ninos.length === 0 ? (
            <div className="alert" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                {busqueda ? `No se encontraron resultados para "${busqueda}"` : 'No tienes niños asignados'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {ninos.map(nino => (
                <div key={nino.id} style={{ padding: '1.25rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: '500' }}>
                    {nino.nombres} {nino.apellidos}
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.6' }}>
                    <div>🎂 Fecha Nac: {formatearFecha(nino.fecha_nacimiento)}</div>
                    <div>📅 Edad: {calcularEdad(nino.fecha_nacimiento)} años</div>
                    {esCumpleañeroDelMes(nino.fecha_nacimiento) && (
                      <div style={{ color: '#f59e0b', fontWeight: '500', marginTop: '0.25rem' }}>
                        🎉 ¡Cumpleaños este mes! (Falta{diasParaCumple(nino.fecha_nacimiento) === 0 ? 'n 0 días - HOY' : `n ${diasParaCumple(nino.fecha_nacimiento)} día${diasParaCumple(nino.fecha_nacimiento) !== 1 ? 's' : ''}`})
                      </div>
                    )}
                    {nino.codigo && <div>🔢 Código: {nino.codigo}</div>}
                    <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                      👨‍🏫 Maestro/a: {nino.maestro_nombre || nino.maestro_email || 'Sin asignar'}
                    </div>
                    {nino.nivel_nombre && <div>📚 Nivel: {nino.nivel_nombre}</div>}
                    {nino.nombre_encargado && <div>👤 Encargado: {nino.nombre_encargado}</div>}
                    {nino.telefono_encargado && <div>📱 Tel: {nino.telefono_encargado}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost" onClick={() => abrirModal(nino)} style={{ flex: 1 }}>
                      Editar
                    </button>
                    <button className="btn btn-danger" onClick={() => handleEliminar(nino.id, `${nino.nombres} ${nino.apellidos}`)} style={{ flex: 1 }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sección de Cumpleañeros del Mes */}
      {!loading && cumpleañerosDelMes.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <h2 className="card-title" style={{ color: 'white' }}>
              🎉 Cumpleañeros de {new Date().toLocaleString('es', { month: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleString('es', { month: 'long' }).slice(1)}
            </h2>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.875rem' }}>
              {cumpleañerosDelMes.length} niño{cumpleañerosDelMes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {cumpleañerosDelMes.map(nino => {
                const dias = diasParaCumple(nino.fecha_nacimiento)
                const esHoy = dias === 0
                return (
                  <div 
                    key={nino.id} 
                    style={{ 
                      padding: '1rem', 
                      background: esHoy ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' : 'var(--surface-elevated)', 
                      borderRadius: 'var(--radius)', 
                      border: esHoy ? '2px solid #f59e0b' : '1px solid var(--border)',
                      position: 'relative'
                    }}
                  >
                    {esHoy && (
                      <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '1.5rem' }}>
                        🎂
                      </div>
                    )}
                    <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '500', color: esHoy ? '#78350f' : 'inherit' }}>
                      {nino.nombres} {nino.apellidos}
                    </h4>
                    <div style={{ fontSize: '0.875rem', color: esHoy ? '#92400e' : 'var(--text-secondary)' }}>
                      <div>🎂 {formatearFecha(nino.fecha_nacimiento)}</div>
                      <div>📅 Cumple {calcularEdad(nino.fecha_nacimiento) + 1} años</div>
                      <div style={{ fontWeight: '500', marginTop: '0.25rem', color: esHoy ? '#78350f' : '#f59e0b' }}>
                        {esHoy ? '🎉 ¡ES HOY!' : `Faltan ${dias} día${dias !== 1 ? 's' : ''}`}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar' : 'Registrar'} Niño</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Nombres*</label>
                  <input className="input" value={nombres} onChange={e => setNombres(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Apellidos*</label>
                  <input className="input" value={apellidos} onChange={e => setApellidos(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Fecha de Nacimiento*</label>
                  <input type="date" className="input" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Código</label>
                  <input className="input" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Opcional" />
                </div>
              </div>

              <div>
                <label className="label">Asignar a Maestro/a*</label>
                <select className="select" value={maestroId} onChange={e => setMaestroId(e.target.value)} required>
                  <option value="">-- Selecciona un maestro/a --</option>
                  {maestros.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nombres} {m.apellidos || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Nivel (Opcional)</label>
                <select className="select" value={nivelId} onChange={e => setNivelId(e.target.value)}>
                  <option value="">Sin nivel</option>
                  {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Nombre del Encargado</label>
                <input className="input" value={nombreEncargado} onChange={e => setNombreEncargado(e.target.value)} />
              </div>

              <div>
                <label className="label">Teléfono del Encargado</label>
                <input className="input" value={telefonoEncargado} onChange={e => setTelefonoEncargado(e.target.value)} />
              </div>

              <div>
                <label className="label">Dirección del Encargado</label>
                <textarea className="textarea" value={direccionEncargado} onChange={e => setDireccionEncargado(e.target.value)} rows={2} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}