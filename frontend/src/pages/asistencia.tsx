import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Swal from 'sweetalert2'

interface Asistencia {
  id: string
  fecha: string
  hora: string | null
  estado: string
  creado_en: string
}

interface Nino {
  id: string
  codigo: string
  nombres: string
  apellidos: string
  nivel_nombre: string | null
  subnivel_nombre: string | null
}

interface Usuario {
  id: string
  email: string
  nombres: string
  rol: string
}

interface DetalleItem {
  nino_id: string
  presente: boolean
}

export default function Asistencia() {
  const navigate = useNavigate()
  const [asistencias, setAsistencias] = useState<Asistencia[]>([])
  const [loading, setLoading] = useState(true)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  
  // Estados para crear nueva asistencia
  const [mostrarModalCrear, setMostrarModalCrear] = useState(false)
  const [paso, setPaso] = useState(1) // 1: fecha/hora, 2: seleccionar niños
  const [fecha, setFecha] = useState('')
  const [hora, setHora] = useState('')
  const [asistenciaTemporal, setAsistenciaTemporal] = useState<any>(null)
  
  // Estados para seleccionar niños
  const [ninosDisponibles, setNinosDisponibles] = useState<Nino[]>([])
  const [ninosSeleccionados, setNinosSeleccionados] = useState<string[]>([])
  const [busquedaNino, setBusquedaNino] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      setLoading(true)
      const [userData, asistenciasData] = await Promise.all([
        api.me(),
        api.asistencia_list()
      ])
      setUsuario(userData)
      setAsistencias(asistenciasData)
    } catch (error) {
      console.error('Error:', error)
      Swal.fire('Error', 'No se pudieron cargar los datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function iniciarNuevaAsistencia() {
    // Resetear estados
    setFecha(new Date().toISOString().split('T')[0])
    setHora(new Date().toTimeString().slice(0, 5))
    setAsistenciaTemporal(null)
    setNinosSeleccionados([])
    setPaso(1)
    setMostrarModalCrear(true)
  }

  async function crearAsistencia() {
    if (!fecha) {
      Swal.fire('Error', 'La fecha es obligatoria', 'error')
      return
    }

    setGuardando(true)
    try {
      console.log('Creando asistencia con:', { fecha, hora })
      
      // Crear asistencia inicial (sin niños)
      const resultado = await api.asistencia_create({
        fecha,
        hora: hora || null
      })

      console.log('Asistencia creada:', resultado)
      setAsistenciaTemporal(resultado)
      
      // Cargar niños a cargo del colaborador
      const ninos = await api.ninos_list()
      setNinosDisponibles(ninos)
      
      // Pasar al paso 2
      setPaso(2)
    } catch (error: any) {
      console.error('Error creando asistencia:', error)
      Swal.fire('Error', error.message || 'No se pudo crear la asistencia', 'error')
    } finally {
      setGuardando(false)
    }
  }

  function toggleNino(ninoId: string) {
    if (ninosSeleccionados.includes(ninoId)) {
      setNinosSeleccionados(ninosSeleccionados.filter(id => id !== ninoId))
    } else {
      setNinosSeleccionados([...ninosSeleccionados, ninoId])
    }
  }

  function seleccionarTodos() {
    const ninosFiltrados = ninosDisponibles
      .filter(n => {
        const nombreCompleto = `${n.nombres} ${n.apellidos} ${n.codigo}`.toLowerCase()
        return nombreCompleto.includes(busquedaNino.toLowerCase())
      })
      .map(n => n.id)
    
    setNinosSeleccionados(ninosFiltrados)
  }

  function deseleccionarTodos() {
    setNinosSeleccionados([])
  }

  async function guardarAsistencia() {
    if (ninosSeleccionados.length === 0) {
      Swal.fire('Error', 'Debe seleccionar al menos un niño', 'error')
      return
    }

    if (!asistenciaTemporal?.id) {
      Swal.fire('Error', 'No hay asistencia activa', 'error')
      return
    }

    setGuardando(true)
    try {
      // Crear items de asistencia (todos presentes por defecto)
      const items: DetalleItem[] = ninosSeleccionados.map(ninoId => ({
        nino_id: ninoId,
        presente: true
      }))

      // Guardar detalles usando la API existente
      await api.asistencia_set_detalles(
        asistenciaTemporal.id,
        items,
        fecha,
        hora || undefined
      )
      
      await Swal.fire('¡Éxito!', `Asistencia guardada para ${ninosSeleccionados.length} niños`, 'success')
      
      setMostrarModalCrear(false)
      setPaso(1)
      setAsistenciaTemporal(null)
      setNinosSeleccionados([])
      
      await cargarDatos()
    } catch (error: any) {
      console.error('Error:', error)
      Swal.fire('Error', error.message || 'No se pudo guardar la asistencia', 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function verDetalle(id: string) {
    try {
      const detalle = await api.asistencia_editar_load(id)
      
      const ninosHtml = detalle.items && detalle.items.length > 0
        ? detalle.items.map((item: any) => `
            <div style="text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb;">
              <strong>${item.codigo || ''}</strong> ${item.nombre || ''}
              ${item.presente ? '<span style="color: #10b981;">✅ Presente</span>' : '<span style="color: #ef4444;">❌ Ausente</span>'}
            </div>
          `).join('')
        : '<p style="text-align: center; color: #6b7280;">Sin niños registrados</p>'

      await Swal.fire({
        title: `📋 Asistencia del ${new Date(detalle.fecha).toLocaleDateString('es-GT')}`,
        html: `
          <div style="text-align: left; margin-bottom: 20px;">
            <p><strong>Hora:</strong> ${detalle.hora || 'No especificada'}</p>
            <p><strong>Estado:</strong> ${detalle.estado}</p>
          </div>
          <div style="background: #f9fafb; padding: 12px; border-radius: 8px; max-height: 300px; overflow-y: auto;">
            <h4 style="margin-top: 0;">Niños (${detalle.items?.length || 0})</h4>
            ${ninosHtml}
          </div>
        `,
        width: '600px',
        confirmButtonText: 'Cerrar'
      })
    } catch (error: any) {
      console.error('Error:', error)
      Swal.fire('Error', 'No se pudo cargar el detalle', 'error')
    }
  }

  async function eliminarAsistencia(id: string, fecha: string) {
    const result = await Swal.fire({
      title: '¿Eliminar asistencia?',
      text: `Se eliminará la asistencia del ${new Date(fecha).toLocaleDateString('es-GT')}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await api.asistencia_delete(id)
        await Swal.fire('¡Eliminada!', 'Asistencia eliminada correctamente', 'success')
        cargarDatos()
      } catch (error: any) {
        console.error('Error:', error)
        Swal.fire('Error', 'No se pudo eliminar la asistencia', 'error')
      }
    }
  }

  function cancelarCreacion() {
    Swal.fire({
      title: '¿Cancelar?',
      text: 'Se perderá la información ingresada',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Continuar'
    }).then((result) => {
      if (result.isConfirmed) {
        setMostrarModalCrear(false)
        setPaso(1)
        setAsistenciaTemporal(null)
        setNinosSeleccionados([])
      }
    })
  }

  const ninosFiltrados = ninosDisponibles.filter(n => {
    const nombreCompleto = `${n.nombres} ${n.apellidos} ${n.codigo}`.toLowerCase()
    return nombreCompleto.includes(busquedaNino.toLowerCase())
  })
  if (loading) {
    return <div className="loading">Cargando asistencias...</div>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>📋 Asistencia</h1>
          <p style={{ color: '#6b7280' }}>Gestión de asistencia de niños</p>
        </div>
        <button onClick={iniciarNuevaAsistencia} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
          <span style={{ fontSize: '1.25rem' }}>➕</span>Nueva Asistencia
        </button>
      </div>

      {asistencias.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</p>
          <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>No hay asistencias registradas</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {asistencias.map((asistencia) => (
            <div key={asistencia.id} className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                      📅 {new Date(asistencia.fecha).toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      background: asistencia.estado === 'completada' ? '#d1fae5' : '#fef3c7', 
                      color: asistencia.estado === 'completada' ? '#065f46' : '#92400e', 
                      borderRadius: '9999px', 
                      fontSize: '0.875rem', 
                      fontWeight: '500' 
                    }}>
                      {asistencia.estado === 'completada' ? '✅ Completada' : '⏳ Pendiente'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#6b7280', flexWrap: 'wrap' }}>
                    {asistencia.hora && <span>🕐 {asistencia.hora}</span>}
                    <span>📆 {new Date(asistencia.creado_en).toLocaleDateString('es-GT')}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  <button onClick={() => verDetalle(asistencia.id)} className="btn" style={{ background: '#3b82f6', color: 'white', fontSize: '0.875rem' }}>
                    👁️ Ver Detalle
                  </button>
                  <button onClick={() => eliminarAsistencia(asistencia.id, asistencia.fecha)} className="btn" style={{ background: '#ef4444', color: 'white', fontSize: '0.875rem' }}>
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL CREAR ASISTENCIA */}
      {mostrarModalCrear && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: paso === 1 ? '500px' : '800px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '2px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>
                {paso === 1 ? '📅 Nueva Asistencia - Fecha y Hora' : '👶 Seleccionar Niños'}
              </h2>
              <button onClick={cancelarCreacion} style={{ background: '#f3f4f6', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>

            {/* PASO 1: Fecha y Hora */}
            {paso === 1 && (
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Fecha *</label>
                  <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="form-input" required style={{ fontSize: '1rem' }} />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Hora</label>
                  <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="form-input" style={{ fontSize: '1rem' }} />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #e5e7eb' }}>
                  <button type="button" onClick={cancelarCreacion} className="btn" disabled={guardando} style={{ flex: 1, fontSize: '1rem', padding: '0.75rem' }}>
                    Cancelar
                  </button>
                  <button type="button" onClick={crearAsistencia} className="btn btn-primary" disabled={guardando || !fecha} style={{ flex: 1, fontSize: '1rem', padding: '0.75rem' }}>
                    {guardando ? '⏳ Creando...' : 'Siguiente →'}
                  </button>
                </div>
              </div>
            )}

            {/* PASO 2: Seleccionar Niños */}
            {paso === 2 && (
              <div>
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#eff6ff', borderRadius: '8px' }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e40af' }}>
                    📅 <strong>{new Date(fecha).toLocaleDateString('es-GT')}</strong> {hora && `• 🕐 ${hora}`}
                  </p>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <input
                    type="text"
                    value={busquedaNino}
                    onChange={(e) => setBusquedaNino(e.target.value)}
                    placeholder="🔍 Buscar niño por nombre o código..."
                    className="form-input"
                    style={{ fontSize: '1rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <button type="button" onClick={seleccionarTodos} className="btn" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                    ✅ Seleccionar Todos
                  </button>
                  <button type="button" onClick={deseleccionarTodos} className="btn" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                    ❌ Deseleccionar Todos
                  </button>
                  <div style={{ marginLeft: 'auto', padding: '0.5rem 1rem', background: '#f3f4f6', borderRadius: '6px', fontSize: '0.875rem', fontWeight: '600' }}>
                    {ninosSeleccionados.length} seleccionados
                  </div>
                </div><div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '0.5rem' }}>
                  {ninosFiltrados.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      {busquedaNino ? 'No se encontraron niños' : 'No tienes niños asignados'}
                    </div>
                  ) : (
                    ninosFiltrados.map((nino) => (
                      <div
                        key={nino.id}
                        onClick={() => toggleNino(nino.id)}
                        style={{
                          padding: '1rem',
                          marginBottom: '0.5rem',
                          background: ninosSeleccionados.includes(nino.id) ? '#dbeafe' : 'white',
                          border: `2px solid ${ninosSeleccionados.includes(nino.id) ? '#3b82f6' : '#e5e7eb'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '4px',
                            border: '2px solid #3b82f6',
                            background: ninosSeleccionados.includes(nino.id) ? '#3b82f6' : 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 'bold'
                          }}>
                            {ninosSeleccionados.includes(nino.id) && '✓'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '600' }}>{nino.nombres} {nino.apellidos}</div>
                            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                              {nino.codigo} {nino.nivel_nombre && `• ${nino.nivel_nombre}`} {nino.subnivel_nombre && `• ${nino.subnivel_nombre}`}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px solid #e5e7eb' }}>
                  <button type="button" onClick={() => setPaso(1)} className="btn" disabled={guardando} style={{ flex: 1, fontSize: '1rem', padding: '0.75rem' }}>
                    ← Atrás
                  </button>
                  <button type="button" onClick={guardarAsistencia} className="btn btn-primary" disabled={guardando || ninosSeleccionados.length === 0} style={{ flex: 1, fontSize: '1rem', padding: '0.75rem' }}>
                    {guardando ? '⏳ Guardando...' : `✅ Guardar (${ninosSeleccionados.length})`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}