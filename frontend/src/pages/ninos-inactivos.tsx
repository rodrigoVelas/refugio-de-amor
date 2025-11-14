import { useState, useEffect } from 'react'
import { API_URL } from '../config'
import Swal from 'sweetalert2'

interface Nino {
  id: string
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  codigo: string | null
  nombre_encargado: string | null
  telefono_encargado: string | null
  nivel_nombre: string | null
  maestro_nombre: string
  maestro_email: string
  motivo_inactividad: string | null
  fecha_inactivacion: string | null
  edad: number
}

export default function GestionNinos() {
  const [ninosActivos, setNinosActivos] = useState<Nino[]>([])
  const [ninosInactivos, setNinosInactivos] = useState<Nino[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const [showInactivarModal, setShowInactivarModal] = useState(false)
  const [ninoSeleccionado, setNinoSeleccionado] = useState<Nino | null>(null)
  const [motivoInactividad, setMotivoInactividad] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    cargarTodos()
  }, [])

  async function cargarTodos() {
    try {
      setLoading(true)
      console.log('📋 Cargando niños activos e inactivos...')
      
      // Cargar activos desde GET /ninos
      const resActivos = await fetch(`${API_URL}/ninos`, { credentials: 'include' })
      const activos = resActivos.ok ? await resActivos.json() : []
      
      // Cargar inactivos desde GET /lista-inactivos
      const resInactivos = await fetch(`${API_URL}/ninos/lista-inactivos`, { credentials: 'include' })
      const inactivos = resInactivos.ok ? await resInactivos.json() : []
      
      console.log('   Activos:', activos.length)
      console.log('   Inactivos:', inactivos.length)
      
      setNinosActivos(activos)
      setNinosInactivos(inactivos)
    } catch (error: any) {
      console.error('❌ Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar niños',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoading(false)
    }
  }

  function abrirModalInactivar(nino: Nino) {
    setNinoSeleccionado(nino)
    setMotivoInactividad('')
    setShowInactivarModal(true)
  }

  async function inactivarNino() {
    if (!ninoSeleccionado) return

    if (!motivoInactividad.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Motivo requerido',
        text: 'Debes especificar el motivo de inactividad',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Inactivar niño?',
      html: `
        <p>¿Estás seguro de inactivar a:</p>
        <p style="font-size: 1.125rem; font-weight: 600; margin: 1rem 0;">
          ${ninoSeleccionado.nombres} ${ninoSeleccionado.apellidos}
        </p>
        <p style="font-size: 0.875rem; color: #666; margin-top: 0.5rem;">
          Se moverá a la tabla de niños inactivos
        </p>
      `,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, inactivar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      setProcesando(true)
      console.log('🚪 Inactivando niño:', ninoSeleccionado.id)

      // Usar POST /ninos/:id/inactivar-manual
      const res = await fetch(`${API_URL}/ninos/${ninoSeleccionado.id}/inactivar-manual`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoInactividad.trim() })
      })

      console.log('   Response status:', res.status)

      if (!res.ok) {
        const data = await res.json()
        console.error('   Error:', data)
        throw new Error(data.error || 'Error al inactivar')
      }

      const data = await res.json()
      console.log('   ✅ Success:', data)

      await Swal.fire({
        icon: 'success',
        title: '¡Inactivado!',
        text: `${ninoSeleccionado.nombres} ${ninoSeleccionado.apellidos} fue movido a inactivos`,
        timer: 2000,
        showConfirmButton: false
      })
      
      setShowInactivarModal(false)
      setNinoSeleccionado(null)
      setMotivoInactividad('')
      cargarTodos()

    } catch (error: any) {
      console.error('❌ Error completo:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error al inactivar',
        text: error.message || 'Error desconocido',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setProcesando(false)
    }
  }

  async function reactivarNino(nino: Nino) {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Reactivar niño?',
      html: `
        <p>¿Estás seguro de reactivar a:</p>
        <p style="font-size: 1.125rem; font-weight: 600; margin: 1rem 0;">
          ${nino.nombres} ${nino.apellidos}
        </p>
        <p style="font-size: 0.875rem; color: #666; margin-top: 0.5rem;">
          Se moverá de vuelta a la tabla de niños activos
        </p>
      `,
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      console.log('✅ Reactivando niño:', nino.id)
      
      // Usar POST /ninos/:id/reactivar-manual
      const res = await fetch(`${API_URL}/ninos/${nino.id}/reactivar-manual`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      console.log('   Response status:', res.status)

      if (!res.ok) {
        const data = await res.json()
        console.error('   Error:', data)
        throw new Error(data.error || 'Error al reactivar')
      }

      const data = await res.json()
      console.log('   ✅ Success:', data)

      await Swal.fire({
        icon: 'success',
        title: '¡Reactivado!',
        text: `${nino.nombres} ${nino.apellidos} fue movido a activos`,
        timer: 2000,
        showConfirmButton: false
      })
      
      cargarTodos()

    } catch (error: any) {
      console.error('❌ Error completo:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error al reactivar',
        text: error.message || 'Error desconocido',
        confirmButtonColor: '#3b82f6'
      })
    }
  }

  function verDetalles(nino: Nino) {
    const infoHTML = `
      <div style="text-align: left; padding: 1rem;">
        <p style="margin: 0.5rem 0;"><strong>👤 Nombre:</strong> ${nino.nombres} ${nino.apellidos}</p>
        <p style="margin: 0.5rem 0;"><strong>🎂 Fecha de Nacimiento:</strong> ${formatearFecha(nino.fecha_nacimiento)}</p>
        <p style="margin: 0.5rem 0;"><strong>📅 Edad:</strong> ${nino.edad} años</p>
        ${nino.codigo ? `<p style="margin: 0.5rem 0;"><strong>🔢 Código:</strong> ${nino.codigo}</p>` : ''}
        ${nino.nivel_nombre ? `<p style="margin: 0.5rem 0;"><strong>📚 Nivel:</strong> ${nino.nivel_nombre}</p>` : ''}
        <p style="margin: 0.5rem 0;"><strong>👨‍🏫 Maestro/a:</strong> ${nino.maestro_nombre || nino.maestro_email || 'Sin asignar'}</p>
        ${nino.nombre_encargado ? `<p style="margin: 0.5rem 0;"><strong>👤 Encargado:</strong> ${nino.nombre_encargado}</p>` : ''}
        ${nino.telefono_encargado ? `<p style="margin: 0.5rem 0;"><strong>📱 Teléfono:</strong> ${nino.telefono_encargado}</p>` : ''}
        ${nino.motivo_inactividad ? `
          <hr style="margin: 1rem 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0.5rem 0; color: #ef4444;"><strong>🚪 Estado:</strong> Inactivo</p>
          <p style="margin: 0.5rem 0;"><strong>Motivo:</strong> ${nino.motivo_inactividad}</p>
          ${nino.fecha_inactivacion ? `<p style="margin: 0.5rem 0;"><strong>Fecha:</strong> ${formatearFecha(nino.fecha_inactivacion)}</p>` : ''}
        ` : ''}
      </div>
    `
    
    Swal.fire({
      title: 'Información del Niño',
      html: infoHTML,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#3b82f6',
      width: '550px'
    })
  }

  function formatearFecha(fecha: string): string {
    const fechaSolo = fecha.split('T')[0]
    const [año, mes, dia] = fechaSolo.split('-')
    return `${dia}/${mes}/${año}`
  }

  function calcularEdad(fechaNac: string): number {
    const hoy = new Date()
    const fechaSolo = fechaNac.split('T')[0]
    const [año, mes, dia] = fechaSolo.split('-').map(Number)
    const nac = new Date(año, mes - 1, dia)
    
    let edad = hoy.getFullYear() - nac.getFullYear()
    const m = hoy.getMonth() - nac.getMonth()
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
    return edad
  }

  // Combinar activos e inactivos
  const todosLosNinos = [
    ...ninosActivos.map(n => ({ ...n, esActivo: true })),
    ...ninosInactivos.map(n => ({ ...n, esActivo: false }))
  ]

  // Filtrar
  const ninosFiltrados = todosLosNinos.filter((nino: any) => {
    if (filtro === 'activos' && !nino.esActivo) return false
    if (filtro === 'inactivos' && nino.esActivo) return false

    if (!busqueda.trim()) return true
    const searchTerm = busqueda.toLowerCase()
    return (
      nino.nombres.toLowerCase().includes(searchTerm) ||
      nino.apellidos.toLowerCase().includes(searchTerm) ||
      (nino.codigo && nino.codigo.toLowerCase().includes(searchTerm)) ||
      (nino.motivo_inactividad && nino.motivo_inactividad.toLowerCase().includes(searchTerm))
    )
  })

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">📋 Gestión de Niños</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Los niños se mueven entre tablas: ninos ↔ ninos_inactivos
            </p>
          </div>
        </div>

        <div className="toolbar" style={{ flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
          {/* Estadísticas */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ 
              padding: '0.75rem 1rem', 
              background: 'var(--surface-elevated)', 
              borderRadius: 'var(--radius)',
              border: '2px solid #10b981'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>{ninosActivos.length}</span>
              <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>Activos</span>
            </div>
            <div style={{ 
              padding: '0.75rem 1rem', 
              background: 'var(--surface-elevated)', 
              borderRadius: 'var(--radius)',
              border: '2px solid #ef4444'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ef4444' }}>{ninosInactivos.length}</span>
              <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>Inactivos</span>
            </div>
            <div style={{ 
              padding: '0.75rem 1rem', 
              background: 'var(--surface-elevated)', 
              borderRadius: 'var(--radius)',
              border: '2px solid var(--primary)'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary)' }}>{todosLosNinos.length}</span>
              <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>Total</span>
            </div>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={filtro === 'todos' ? 'btn' : 'btn btn-ghost'}
                onClick={() => setFiltro('todos')}
              >
                Todos ({todosLosNinos.length})
              </button>
              <button
                className={filtro === 'activos' ? 'btn' : 'btn btn-ghost'}
                onClick={() => setFiltro('activos')}
                style={filtro === 'activos' ? { background: '#10b981' } : {}}
              >
                ✅ Activos ({ninosActivos.length})
              </button>
              <button
                className={filtro === 'inactivos' ? 'btn' : 'btn btn-ghost'}
                onClick={() => setFiltro('inactivos')}
                style={filtro === 'inactivos' ? { background: '#ef4444' } : {}}
              >
                🚪 Inactivos ({ninosInactivos.length})
              </button>
            </div>

            {/* Buscador */}
            <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
                🔍
              </span>
              <input
                type="text"
                className="input"
                placeholder="Buscar por nombre, código o motivo..."
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
        </div>

        <div className="card-content">
          {loading ? (
            <div className="loading">Cargando...</div>
          ) : ninosFiltrados.length === 0 ? (
            <div className="alert" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                {busqueda ? `No se encontraron resultados para "${busqueda}"` : 'No hay niños'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {ninosFiltrados.map((nino: any) => (
                <div 
                  key={nino.id} 
                  style={{ 
                    padding: '1.25rem', 
                    background: 'var(--surface-elevated)', 
                    borderRadius: 'var(--radius)', 
                    border: nino.esActivo ? '2px solid #d1fae5' : '2px solid #fee2e2',
                    position: 'relative'
                  }}
                >
                  {/* Badge de estado */}
                  <div style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    background: nino.esActivo ? '#d1fae5' : '#fee2e2',
                    color: nino.esActivo ? '#065f46' : '#991b1b',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {nino.esActivo ? '✅ ACTIVO' : '🚪 INACTIVO'}
                  </div>

                  <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: '500', paddingRight: '6rem' }}>
                    {nino.nombres} {nino.apellidos}
                  </h3>

                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.6' }}>
                    <div>🎂 {formatearFecha(nino.fecha_nacimiento)}</div>
                    <div>📅 {calcularEdad(nino.fecha_nacimiento)} años</div>
                    {nino.codigo && <div>🔢 {nino.codigo}</div>}
                    {nino.nivel_nombre && <div>📚 {nino.nivel_nombre}</div>}
                    {!nino.esActivo && nino.motivo_inactividad && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        padding: '0.5rem', 
                        background: '#fee2e2', 
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        color: '#991b1b'
                      }}>
                        <strong>Motivo:</strong> {nino.motivo_inactividad}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => verDetalles(nino)}
                      style={{ flex: '1 1 auto' }}
                    >
                      👁️ Ver
                    </button>
                    {nino.esActivo ? (
                      <button 
                        className="btn"
                        onClick={() => abrirModalInactivar(nino)}
                        style={{ 
                          flex: '1 1 auto',
                          background: '#ef4444',
                          color: 'white'
                        }}
                      >
                        🚪 Inactivar
                      </button>
                    ) : (
                      <button 
                        className="btn"
                        onClick={() => reactivarNino(nino)}
                        style={{ 
                          flex: '1 1 auto',
                          background: '#10b981',
                          color: 'white'
                        }}
                      >
                        ✅ Reactivar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de inactivar */}
      {showInactivarModal && ninoSeleccionado && (
        <div className="modal-backdrop" onClick={() => !procesando && setShowInactivarModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h2>🚪 Inactivar Niño</h2>
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowInactivarModal(false)}
                disabled={procesando}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div className="alert" style={{ 
                marginBottom: '1.5rem', 
                background: '#fef3c7', 
                border: '2px solid #f59e0b', 
                color: '#92400e',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ fontSize: '1.5rem' }}>⚠️</div>
                  <div>
                    <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      Vas a inactivar a:
                    </p>
                    <p style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                      {ninoSeleccionado.nombres} {ninoSeleccionado.apellidos}
                    </p>
                    <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      Se moverá a la tabla de niños inactivos
                    </p>
                  </div>
                </div>
              </div>

              <div className="form">
                <div>
                  <label className="label" style={{ fontWeight: '600', fontSize: '1rem' }}>
                    Motivo de inactividad *
                  </label>
                  <textarea
                    className="textarea"
                    value={motivoInactividad}
                    onChange={e => setMotivoInactividad(e.target.value)}
                    placeholder="Ejemplo: Cumplió 18 años, Se mudó de ciudad, Finalizó el programa, Graduación..."
                    rows={4}
                    required
                    disabled={procesando}
                    style={{ fontSize: '0.95rem' }}
                  />
                  <small style={{ 
                    display: 'block', 
                    marginTop: '0.5rem', 
                    color: 'var(--text-secondary)',
                    fontSize: '0.875rem'
                  }}>
                    📝 Especifica claramente el motivo de inactividad
                  </small>
                </div>
              </div>
            </div>

            <div className="modal-actions" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowInactivarModal(false)}
                disabled={procesando}
              >
                Cancelar
              </button>
              <button 
                className="btn"
                onClick={inactivarNino}
                disabled={procesando || !motivoInactividad.trim()}
                style={{ 
                  background: '#ef4444',
                  opacity: (procesando || !motivoInactividad.trim()) ? 0.5 : 1
                }}
              >
                {procesando ? 'Inactivando...' : '🚪 Inactivar Niño'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}