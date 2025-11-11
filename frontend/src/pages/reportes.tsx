import { useState, useEffect } from 'react'
import { API_URL } from '../config'
import Swal from 'sweetalert2'

interface Usuario {
  id: string
  email: string
  nombres: string
  rol: string
}

export default function Reportes() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [reporteActivo, setReporteActivo] = useState<'financiero' | 'asistencia' | 'ninos' | 'inactivos'>('financiero')

  // Estados para filtros
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())

  useEffect(() => {
    cargarUsuario()
  }, [])

  async function cargarUsuario() {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUsuario(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const puedeVerReportes = usuario ? 
    (String(usuario.rol).toLowerCase() === 'directora' || 
     String(usuario.rol).toLowerCase() === 'contabilidad') : false

  // ==================== FUNCIONES DE DESCARGA ====================

  function descargarReporteFinanciero() {
    const url = `${API_URL}/reportes/financiero/export.csv?mes=${mes}&anio=${anio}`
    window.open(url, '_blank')
    
    Swal.fire({
      icon: 'success',
      title: 'Descargando...',
      text: 'El reporte se está descargando',
      timer: 2000,
      showConfirmButton: false
    })
  }

  function descargarReporteAsistencia() {
    const url = `${API_URL}/reportes/asistencia/export.csv?mes=${mes}&anio=${anio}`
    window.open(url, '_blank')
    
    Swal.fire({
      icon: 'success',
      title: 'Descargando...',
      text: 'El reporte se está descargando',
      timer: 2000,
      showConfirmButton: false
    })
  }

  function descargarReporteNinos() {
    const url = `${API_URL}/reportes/ninos/export.csv`
    window.open(url, '_blank')
    
    Swal.fire({
      icon: 'success',
      title: 'Descargando...',
      text: 'El reporte se está descargando',
      timer: 2000,
      showConfirmButton: false
    })
  }

  function descargarReporteInactivos() {
    const url = `${API_URL}/reportes/ninos-inactivos/export.csv`
    window.open(url, '_blank')
    
    Swal.fire({
      icon: 'success',
      title: 'Descargando...',
      text: 'El reporte se está descargando',
      timer: 2000,
      showConfirmButton: false
    })
  }

  // ==================== RENDER ====================

  if (loading) {
    return <div className="loading">Cargando...</div>
  }

  if (!puedeVerReportes) {
    return (
      <div className="content">
        <div className="card">
          <div className="card-content" style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔒</div>
            <h2 style={{ marginBottom: '0.5rem' }}>Acceso Restringido</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Solo la directora y contabilidad pueden acceder a los reportes
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">📊 Reportes</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Descarga reportes en formato CSV (Excel)
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ borderBottom: '1px solid var(--border)', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { id: 'financiero', label: '💰 Financiero' },
              { id: 'asistencia', label: '📅 Asistencia' },
              { id: 'ninos', label: '👶 Niños Activos' },
              { id: 'inactivos', label: '🚪 Niños Inactivos' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setReporteActivo(tab.id as any)}
                style={{
                  padding: '1rem 1.5rem',
                  background: 'none',
                  border: 'none',
                  borderBottom: reporteActivo === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                  color: reporteActivo === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: reporteActivo === tab.id ? '500' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-content">
          {/* REPORTE FINANCIERO */}
          {reporteActivo === 'financiero' && (
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>💰 Reporte Financiero Mensual</h2>
              
              <div className="alert" style={{ marginBottom: '1.5rem', background: '#eff6ff', border: '1px solid #3b82f6', color: '#1e40af' }}>
                <strong>📋 Incluye:</strong> Todas las facturas del mes seleccionado con totales de ingresos, egresos y balance
              </div>

              <div className="form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label className="label">Mes *</label>
                    <select
                      className="input"
                      value={mes}
                      onChange={e => setMes(parseInt(e.target.value))}
                    >
                      {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Año *</label>
                    <input
                      type="number"
                      className="input"
                      value={anio}
                      onChange={e => setAnio(parseInt(e.target.value))}
                      min={2020}
                      max={2030}
                    />
                  </div>
                </div>

                <button
                  className="btn"
                  onClick={descargarReporteFinanciero}
                  style={{ width: '100%', fontSize: '1rem', padding: '0.75rem' }}
                >
                  📥 Descargar Reporte CSV
                </button>
              </div>
            </div>
          )}

          {/* REPORTE ASISTENCIA */}
          {reporteActivo === 'asistencia' && (
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>📅 Reporte de Asistencia Mensual</h2>
              
              <div className="alert" style={{ marginBottom: '1.5rem', background: '#f0fdf4', border: '1px solid #10b981', color: '#065f46' }}>
                <strong>📋 Incluye:</strong> Todos los niños que asistieron en el mes seleccionado con estadísticas
              </div>

              <div className="form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <label className="label">Mes *</label>
                    <select
                      className="input"
                      value={mes}
                      onChange={e => setMes(parseInt(e.target.value))}
                    >
                      {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Año *</label>
                    <input
                      type="number"
                      className="input"
                      value={anio}
                      onChange={e => setAnio(parseInt(e.target.value))}
                      min={2020}
                      max={2030}
                    />
                  </div>
                </div>

                <button
                  className="btn"
                  onClick={descargarReporteAsistencia}
                  style={{ width: '100%', fontSize: '1rem', padding: '0.75rem' }}
                >
                  📥 Descargar Reporte CSV
                </button>
              </div>
            </div>
          )}

          {/* REPORTE NIÑOS ACTIVOS */}
          {reporteActivo === 'ninos' && (
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>👶 Reporte de Todos los Niños Activos</h2>
              
              <div className="alert" style={{ marginBottom: '1.5rem', background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e' }}>
                <strong>📋 Incluye:</strong> Lista completa de todos los niños activos con datos personales
              </div>

              <div className="form">
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                  Este reporte incluye todos los niños actualmente activos en el sistema con su información completa.
                </p>

                <button
                  className="btn"
                  onClick={descargarReporteNinos}
                  style={{ width: '100%', fontSize: '1rem', padding: '0.75rem' }}
                >
                  📥 Descargar Reporte CSV
                </button>
              </div>
            </div>
          )}

          {/* REPORTE NIÑOS INACTIVOS */}
          {reporteActivo === 'inactivos' && (
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>🚪 Reporte de Todos los Niños Inactivos</h2>
              
              <div className="alert" style={{ marginBottom: '1.5rem', background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b' }}>
                <strong>📋 Incluye:</strong> Todos los niños inactivos con motivo y fecha de salida
              </div>

              <div className="form">
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
                  Este reporte incluye todos los niños que han sido marcados como inactivos y el motivo de su salida.
                </p>

                <button
                  className="btn"
                  onClick={descargarReporteInactivos}
                  style={{ width: '100%', fontSize: '1rem', padding: '0.75rem' }}
                >
                  📥 Descargar Reporte CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}