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

  // Estados para Reporte Financiero
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  // Estados para Reporte Asistencia
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

  // ==================== DESCARGAR REPORTES ====================
  
  function descargarReporteFinanciero() {
    if (!fechaInicio || !fechaFin) {
      Swal.fire({
        icon: 'warning',
        title: 'Fechas requeridas',
        text: 'Selecciona un rango de fechas',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const url = `${API_URL}/reportes/financiero/export.csv?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`
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

        {/* Tabs de reportes */}
        <div style={{ borderBottom: '1px solid var(--border)', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setReporteActivo('financiero')}
              style={{
                padding: '1rem 1.5rem',
                background: 'none',
                border: 'none',
                borderBottom: reporteActivo === 'financiero' ? '2px solid var(--primary)' : '2px solid transparent',
                color: reporteActivo === 'financiero' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: reporteActivo === 'financiero' ? '500' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              💰 Financiero
            </button>
            <button
              onClick={() => setReporteActivo('asistencia')}
              style={{
                padding: '1rem 1.5rem',
                background: 'none',
                border: 'none',
                borderBottom: reporteActivo === 'asistencia' ? '2px solid var(--primary)' : '2px solid transparent',
                color: reporteActivo === 'asistencia' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: reporteActivo === 'asistencia' ? '500' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              📅 Asistencia
            </button>
            <button
              onClick={() => setReporteActivo('ninos')}
              style={{
                padding: '1rem 1.5rem',
                background: 'none',
                border: 'none',
                borderBottom: reporteActivo === 'ninos' ? '2px solid var(--primary)' : '2px solid transparent',
                color: reporteActivo === 'ninos' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: reporteActivo === 'ninos' ? '500' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              👶 Niños Activos
            </button>
            <button
              onClick={() => setReporteActivo('inactivos')}
              style={{
                padding: '1rem 1.5rem',
                background: 'none',
                border: 'none',
                borderBottom: reporteActivo === 'inactivos' ? '2px solid var(--primary)' : '2px solid transparent',
                color: reporteActivo === 'inactivos' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: reporteActivo === 'inactivos' ? '500' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🚪 Niños Inactivos
            </button>
          </div>
        </div>

        <div className="card-content">
          {/* REPORTE FINANCIERO */}
          {reporteActivo === 'financiero' && (
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                💰 Reporte Financiero
              </h2>
              
              <div className="alert" style={{ marginBottom: '1.5rem', background: '#eff6ff', border: '1px solid #3b82f6', color: '#1e40af' }}>
                <strong>📋 Incluye:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                  <li>Todas las facturas (ingresos y egresos)</li>
                  <li>Totales por tipo de factura</li>
                  <li>Balance general</li>
                  <li>Fechas de emisión y subida</li>
                </ul>
              </div>

              <div className="form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Fecha Inicio *</label>
                    <input
                      type="date"
                      className="input"
                      value={fechaInicio}
                      onChange={e => setFechaInicio(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Fecha Fin *</label>
                    <input
                      type="date"
                      className="input"
                      value={fechaFin}
                      onChange={e => setFechaFin(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  className="btn"
                  onClick={descargarReporteFinanciero}
                  style={{ marginTop: '1rem', width: '100%', fontSize: '1rem', padding: '0.75rem' }}
                >
                  📥 Descargar Reporte CSV
                </button>
              </div>
            </div>
          )}

          {/* REPORTE ASISTENCIA */}
          {reporteActivo === 'asistencia' && (
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📅 Reporte de Asistencia
              </h2>
              
              <div className="alert" style={{ marginBottom: '1.5rem', background: '#f0fdf4', border: '1px solid #10b981', color: '#065f46' }}>
                <strong>📋 Incluye:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                  <li>Registro completo de asistencia</li>
                  <li>Datos de niños por nivel y subnivel</li>
                  <li>Estadísticas de presentes/ausentes</li>
                  <li>Porcentaje de asistencia</li>
                </ul>
              </div>

              <div className="form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Mes *</label>
                    <select
                      className="input"
                      value={mes}
                      onChange={e => setMes(parseInt(e.target.value))}
                    >
                      <option value={1}>Enero</option>
                      <option value={2}>Febrero</option>
                      <option value={3}>Marzo</option>
                      <option value={4}>Abril</option>
                      <option value={5}>Mayo</option>
                      <option value={6}>Junio</option>
                      <option value={7}>Julio</option>
                      <option value={8}>Agosto</option>
                      <option value={9}>Septiembre</option>
                      <option value={10}>Octubre</option>
                      <option value={11}>Noviembre</option>
                      <option value={12}>Diciembre</option>
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
                  style={{ marginTop: '1rem', width: '100%', fontSize: '1rem', padding: '0.75rem' }}
                >
                  📥 Descargar Reporte CSV
                </button>
              </div>
            </div>
          )}

          {/* REPORTE NIÑOS ACTIVOS */}
          {reporteActivo === 'ninos' && (
            <div style={{ maxWidth: '600px' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                👶 Reporte de Niños Activos
              </h2>
              
              <div className="alert" style={{ marginBottom: '1.5rem', background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e' }}>
                <strong>📋 Incluye:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                  <li>Lista completa de niños activos</li>
                  <li>Datos personales y de contacto</li>
                  <li>Información de nivel y subnivel</li>
                  <li>Estadísticas por género, edad y nivel</li>
                </ul>
              </div>

              <div className="form">
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  Este reporte incluye todos los niños actualmente activos en el sistema.
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
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🚪 Reporte de Niños Inactivos
              </h2>
              
              <div className="alert" style={{ marginBottom: '1.5rem', background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b' }}>
                <strong>📋 Incluye:</strong>
                <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
                  <li>Lista de niños que han salido del refugio</li>
                  <li>Motivo de inactividad</li>
                  <li>Fecha de inactivación</li>
                  <li>Datos históricos del niño</li>
                  <li>Estadísticas de salidas</li>
                </ul>
              </div>

              <div className="form">
                <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  Este reporte incluye todos los niños que fueron marcados como inactivos y el motivo de su salida.
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