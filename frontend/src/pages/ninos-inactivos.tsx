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
  activo: boolean
}

export default function GestionNinos() {
  const [ninos, setNinos] = useState<Nino[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'inactivos'>('todos')

  // Estados para modal de inactivar
  const [showInactivarModal, setShowInactivarModal] = useState(false)
  const [ninoSeleccionado, setNinoSeleccionado] = useState<Nino | null>(null)
  const [motivoInactividad, setMotivoInactividad] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    cargarTodosLosNinos()
  }, [])

  async function cargarTodosLosNinos() {
    try {
      setLoading(true)
      console.log('📋 Cargando todos los niños...')
      
      const res = await fetch(`${API_URL}/ninos`, { credentials: 'include' })
      
      if (!res.ok) {
        throw new Error('Error al cargar niños')
      }
      
      const data = await res.json()
      console.log('   Total niños:', data.length)
      console.log('   Activos:', data.filter((n: any) => n.activo !== false).length)
      console.log('   Inactivos:', data.filter((n: any) => n.activo === false).length)
      
      setNinos(data)
    } catch (error: any) {
      console.error('❌ Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al cargar niños',
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
      console.log('\n🚪 Inactivando niño con PATCH')
      console.log('   ID:', ninoSeleccionado.id)
      console.log('   Motivo:', motivoInactividad.trim())

      // USAR PATCH /ninos/:id/estado
      const res = await fetch(`${API_URL}/ninos/${ninoSeleccionado.id}/estado`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo: false,
          motivo_inactividad: motivoInactividad.trim()
        })
      })

      console.log('   Response status:', res.status)
      console.log('   Response ok:', res.ok)

      if (!res.ok) {
        const contentType = res.headers.get('content-type')
        let errorMessage = 'Error al inactivar niño'
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json()
          console.error('   Error data:', errorData)
          errorMessage = errorData.error || errorMessage
        } else {
          const errorText = await res.text()
          console.error('   Error text:', errorText)
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      const data = await res.json()
      console.log('   ✅ Response data:', data)

      await Swal.fire({
        icon: 'success',
        title: '¡Inactivado!',
        text: `${ninoSeleccionado.nombres} ${ninoSeleccionado.apellidos} fue inactivado`,
        timer: 2000,
        showConfirmButton: false
      })
      
      setShowInactivarModal(false)
      setNinoSeleccionado(null)
      setMotivoInactividad('')
      cargarTodosLosNinos()

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
      `,
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, reactivar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      console.log('\n✅ Reactivando niño con PATCH')
      console.log('   ID:', nino.id)
      
      // USAR PATCH /ninos/:id/estado
      const res = await fetch(`${API_URL}/ninos/${nino.id}/estado`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activo: true,
          motivo_inactividad: null
        })
      })

      console.log('   Response status:', res.status)
      console.log('   Response ok:', res.ok)

      if (!res.ok) {
        const contentType = res.headers.get('content-type')
        let errorMessage = 'Error al reactivar niño'
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await res.json()
          console.error('   Error data:', errorData)
          errorMessage = errorData.error || errorMessage
        } else {
          const errorText = await res.text()
          console.error('   Error text:', errorText)
          errorMessage = errorText || errorMessage
        }
        
        throw new Error(errorMessage)
      }

      const data = await res.json()
      console.log('   ✅ Response data:', data)

      await Swal.fire({
        icon: 'success',
        title: '¡Reactivado!',
        text: `${nino.nombres} ${nino.apellidos} fue reactivado`,
        timer: 2000,
        showConfirmButton: false
      })
      
      cargarTodosLosNinos()

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
        ${nino.activo === false ? `
          <hr style="margin: 1rem 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0.5rem 0; color: #ef4444;"><strong>🚪 Estado:</strong> Inactivo</p>
          ${nino.motivo_inactividad ? `<p style="margin: 0.5rem 0;"><strong>Motivo:</strong> ${nino.motivo_inactividad}</p>` : ''}
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

  // Filtrar niños
  const ninosFiltrados = ninos.filter(nino => {
    // Filtro por estado
    if (filtro === 'activos' && nino.activo === false) return false
    if (filtro === 'inactivos' && nino.activo !== false) return false

    // Filtro por búsqueda
    if (!busqueda.trim()) return true
    const searchTerm = busqueda.toLowerCase()
    return (
      nino.nombres.toLowerCase().includes(searchTerm) ||
      nino.apellidos.toLowerCase().includes(searchTerm) ||
      (nino.codigo && nino.codigo.toLowerCase().includes(searchTerm)) ||
      (nino.motivo_inactividad && nino.motivo_inactividad.toLowerCase().includes(searchTerm))
    )
  })

  const totalActivos = ninos.filter(n => n.activo !== false).length
  const totalInactivos = ninos.filter(n => n.activo === false).length

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">📋 Gestión de Niños</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Ver todos los niños y cambiar su estado (activo/inactivo)
            </p>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="toolbar" style={{ flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}>
          {/* Estadísticas */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ 
              padding: '0.75rem 1rem', 
              background: 'var(--surface-elevated)', 
              borderRadius: 'var(--radius)',
              border: '2px solid #10b981'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>{totalActivos}</span>
              <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>Activos</span>
            </div>
            <div style={{ 
              padding: '0.75rem 1rem', 
              background: 'var(--surface-elevated)', 
              borderRadius: 'var(--radius)',
              border: '2px solid #ef4444'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ef4444' }}>{totalInactivos}</span>
              <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>Inactivos</span>
            </div>
            <div style={{ 
              padding: '0.75rem 1rem', 
              background: 'var(--surface-elevated)', 
              borderRadius: 'var(--radius)',
              border: '2px solid var(--primary)'
            }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary)' }}>{ninos.length}</span>
              <span style={{ marginLeft: '0.5rem', color: 'var(--text-secondary)' }}>Total</span>
            </div>
          </div>

          {/* Filtros y búsqueda */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Botones de filtro */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={filtro === 'todos' ? 'btn' : 'btn btn-ghost'}
                onClick={() => setFiltro('todos')}
              >
                Todos ({ninos.length})
              </button>
              <button
                className={filtro === 'activos' ? 'btn' : 'btn btn-ghost'}
                onClick={() => setFiltro('activos')}
                style={filtro === 'activos' ? { background: '#10b981' } : {}}
              >
                ✅ Activos ({totalActivos})
              </button>
              <button
                className={filtro === 'inactivos' ? 'btn' : 'btn btn-ghost'}
                onClick={() => setFiltro('inactivos')}
                style={filtro === 'inactivos' ? { background: '#ef4444' } : {}}
              >
                🚪 Inactivos ({totalInactivos})
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
                placeholder="Buscar por código, nombre o motivo..."
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
                {busqueda ? `No se encontraron resultados para "${busqueda}"` : 'No se encontraron niños'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {ninosFiltrados.map(nino => (
                <div 
                  key={nino.id} 
                  style={{ 
                    padding: '1.25rem', 
                    background: 'var(--surface-elevated)', 
                    borderRadius: 'var(--radius)', 
                    border: nino.activo === false ? '2px solid #fee2e2' : '2px solid #d1fae5',
                    position: 'relative'
                  }}
                >
                  {/* Badge de estado */}
                  <div style={{
                    position: 'absolute',
                    top: '0.75rem',
                    right: '0.75rem',
                    background: nino.activo === false ? '#fee2e2' : '#d1fae5',
                    color: nino.activo === false ? '#991b1b' : '#065f46',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '600'
                  }}>
                    {nino.activo === false ? '🚪 INACTIVO' : '✅ ACTIVO'}
                  </div>

                  <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: '500', paddingRight: '6rem' }}>
                    {nino.nombres} {nino.apellidos}
                  </h3>

                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.6' }}>
                    <div>🎂 Fecha Nac: {formatearFecha(nino.fecha_nacimiento)}</div>
                    <div>📅 Edad: {calcularEdad(nino.fecha_nacimiento)} años</div>
                    {nino.codigo && <div>🔢 Código: {nino.codigo}</div>}
                    {nino.nivel_nombre && <div>📚 Nivel: {nino.nivel_nombre}</div>}
                    {nino.activo === false && nino.motivo_inactividad && (
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
                    {nino.activo !== false ? (
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
                    📝 Especifica claramente el motivo por el cual el niño ya no estará activo.
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