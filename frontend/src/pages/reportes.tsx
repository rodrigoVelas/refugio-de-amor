import { useState, useEffect } from 'react'
import { API_URL } from '../config'
import Swal from 'sweetalert2'

interface Usuario {
  id: string
  email: string
  nombres: string
  rol: string
}

// Función para descargar CSV manualmente
function descargarCSV(data: any[][], filename: string) {
  const csvContent = data.map(row => 
    row.map(cell => {
      const str = String(cell ?? '')
      // Escapar comillas y envolver en comillas si contiene comas o saltos de línea
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  ).join('\n')

  // Agregar BOM para que Excel reconozca UTF-8
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

export default function Reportes() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [reporteActivo, setReporteActivo] = useState<'financiero' | 'asistencia' | 'ninos' | 'inactivos'>('financiero')

  // Estados para datos
  const [datosFinancieros, setDatosFinancieros] = useState<any[]>([])
  const [resumenFinanciero, setResumenFinanciero] = useState<any>(null)
  const [datosAsistencia, setDatosAsistencia] = useState<any[]>([])
  const [resumenAsistencia, setResumenAsistencia] = useState<any>(null)
  const [datosNinos, setDatosNinos] = useState<any[]>([])
  const [datosInactivos, setDatosInactivos] = useState<any[]>([])

  // Estados para filtros
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())

  // Estados de carga
  const [loadingFinanciero, setLoadingFinanciero] = useState(false)
  const [loadingAsistencia, setLoadingAsistencia] = useState(false)
  const [loadingNinos, setLoadingNinos] = useState(false)
  const [loadingInactivos, setLoadingInactivos] = useState(false)

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

  // ==================== CARGAR DATOS ====================

  async function cargarDatosFinancieros() {
    if (!fechaInicio || !fechaFin) {
      Swal.fire({
        icon: 'warning',
        title: 'Fechas requeridas',
        text: 'Selecciona un rango de fechas',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    try {
      setLoadingFinanciero(true)

      const res = await fetch(
        `${API_URL}/reportes/financiero?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`,
        { credentials: 'include' }
      )

      if (res.ok) {
        const data = await res.json()
        console.log('📊 Datos financieros recibidos:', data)
        setDatosFinancieros(data.facturas || [])
        setResumenFinanciero(data.resumen || {})
        
        Swal.fire({
          icon: 'success',
          title: '¡Datos cargados!',
          text: `${data.facturas?.length || 0} facturas encontradas`,
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Error al cargar datos')
      }
    } catch (error: any) {
      console.error('❌ Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al cargar datos financieros',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoadingFinanciero(false)
    }
  }

  async function cargarDatosAsistencia() {
    try {
      setLoadingAsistencia(true)

      const res = await fetch(
        `${API_URL}/reportes/asistencia?mes=${mes}&anio=${anio}`,
        { credentials: 'include' }
      )

      if (res.ok) {
        const data = await res.json()
        console.log('📊 Datos asistencia recibidos:', data)
        setDatosAsistencia(data.asistencias || [])
        setResumenAsistencia(data.resumen || {})
        
        Swal.fire({
          icon: 'success',
          title: '¡Datos cargados!',
          text: `${data.asistencias?.length || 0} registros encontrados`,
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Error al cargar datos')
      }
    } catch (error: any) {
      console.error('❌ Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al cargar datos de asistencia',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoadingAsistencia(false)
    }
  }

  async function cargarDatosNinos() {
    try {
      setLoadingNinos(true)

      const res = await fetch(`${API_URL}/reportes/ninos`, { credentials: 'include' })

      if (res.ok) {
        const data = await res.json()
        console.log('📊 Datos niños recibidos:', data)
        setDatosNinos(data.ninos || [])
        
        Swal.fire({
          icon: 'success',
          title: '¡Datos cargados!',
          text: `${data.ninos?.length || 0} niños activos`,
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Error al cargar datos')
      }
    } catch (error: any) {
      console.error('❌ Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al cargar datos de niños',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoadingNinos(false)
    }
  }

  async function cargarDatosInactivos() {
    try {
      setLoadingInactivos(true)

      const res = await fetch(`${API_URL}/ninos`, { credentials: 'include' })

      if (res.ok) {
        const data = await res.json()
        const inactivos = data.filter((n: any) => !n.activo)
        console.log('📊 Datos inactivos recibidos:', inactivos)
        setDatosInactivos(inactivos)
        
        Swal.fire({
          icon: 'success',
          title: '¡Datos cargados!',
          text: `${inactivos.length} niños inactivos`,
          timer: 2000,
          showConfirmButton: false
        })
      } else {
        const error = await res.json()
        throw new Error(error.error || 'Error al cargar datos')
      }
    } catch (error: any) {
      console.error('❌ Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al cargar datos de niños inactivos',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoadingInactivos(false)
    }
  }

  // ==================== FUNCIONES DE DESCARGA ====================

  function descargarReporteFinanciero() {
    if (datosFinancieros.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Primero debes cargar los datos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const csvData = [
      ['No. Factura', 'Descripción', 'Tipo', 'Monto', 'Estado', 'Fecha Emisión', 'Fecha Vencimiento', 'Fecha Subida', 'Creado Por'],
      ...datosFinancieros.map(f => [
        f.numero_factura,
        f.descripcion,
        f.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        `Q ${parseFloat(f.monto).toFixed(2)}`,
        f.estado,
        f.fecha_emision,
        f.fecha_vencimiento || '',
        f.creado_en,
        f.creado_por_nombre || ''
      ]),
      [],
      ['RESUMEN'],
      ['Total Ingresos', '', '', `Q ${resumenFinanciero?.ingresos || '0.00'}`],
      ['Total Egresos', '', '', `Q ${resumenFinanciero?.egresos || '0.00'}`],
      ['Balance', '', '', `Q ${resumenFinanciero?.balance || '0.00'}`]
    ]

    descargarCSV(csvData, `reporte_financiero_${fechaInicio}_${fechaFin}.csv`)
    
    Swal.fire({
      icon: 'success',
      title: '¡Descargado!',
      timer: 1500,
      showConfirmButton: false
    })
  }

  function descargarReporteAsistencia() {
    if (datosAsistencia.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Primero debes cargar los datos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const csvData = [
      ['Fecha', 'Niño', 'Nivel', 'Subnivel', 'Estado', 'Registrado Por'],
      ...datosAsistencia.map(a => [
        a.fecha,
        a.nino_nombre,
        a.nivel_nombre || 'Sin nivel',
        a.subnivel_nombre || 'Sin subnivel',
        a.estado,
        a.registrado_por_nombre || ''
      ]),
      [],
      ['RESUMEN'],
      ['Total Registros', resumenAsistencia?.total_registros || 0],
      ['Presentes', resumenAsistencia?.presentes || 0],
      ['Ausentes', resumenAsistencia?.ausentes || 0],
      ['Suplentes', resumenAsistencia?.suplentes || 0],
      ['% Asistencia', `${resumenAsistencia?.porcentaje_asistencia || 0}%`]
    ]

    descargarCSV(csvData, `reporte_asistencia_${mes}_${anio}.csv`)
    
    Swal.fire({
      icon: 'success',
      title: '¡Descargado!',
      timer: 1500,
      showConfirmButton: false
    })
  }

  function descargarReporteNinos() {
    if (datosNinos.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Primero debes cargar los datos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const csvData = [
      ['Nombres', 'Apellidos', 'Fecha Nacimiento', 'Edad', 'Género', 'Nivel', 'Subnivel', 'Encargado', 'Teléfono', 'Dirección'],
      ...datosNinos.map(n => [
        n.nombres,
        n.apellidos,
        n.fecha_nacimiento,
        n.edad,
        n.genero === 'M' ? 'Masculino' : 'Femenino',
        n.nivel_nombre || 'Sin nivel',
        n.subnivel_nombre || 'Sin subnivel',
        n.nombre_encargado || '',
        n.telefono_contacto || '',
        n.direccion || ''
      ]),
      [],
      ['RESUMEN'],
      ['Total Niños Activos', datosNinos.length]
    ]

    descargarCSV(csvData, `reporte_ninos_activos_${new Date().toISOString().split('T')[0]}.csv`)
    
    Swal.fire({
      icon: 'success',
      title: '¡Descargado!',
      timer: 1500,
      showConfirmButton: false
    })
  }

  function descargarReporteInactivos() {
    if (datosInactivos.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Primero debes cargar los datos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const csvData = [
      ['Nombres', 'Apellidos', 'Fecha Nacimiento', 'Edad', 'Género', 'Nivel', 'Motivo Inactividad', 'Fecha Inactivación'],
      ...datosInactivos.map(n => [
        n.nombres,
        n.apellidos,
        n.fecha_nacimiento,
        n.edad || '',
        n.genero === 'M' ? 'Masculino' : 'Femenino',
        n.nivel_nombre || 'Sin nivel',
        n.motivo_inactividad || 'No especificado',
        n.fecha_inactivacion || ''
      ]),
      [],
      ['RESUMEN'],
      ['Total Niños Inactivos', datosInactivos.length]
    ]

    descargarCSV(csvData, `reporte_ninos_inactivos_${new Date().toISOString().split('T')[0]}.csv`)
    
    Swal.fire({
      icon: 'success',
      title: '¡Descargado!',
      timer: 1500,
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
              Genera y descarga reportes en formato CSV (Excel)
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
            <div style={{ maxWidth: '800px' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>💰 Reporte Financiero</h2>
              
              <div className="alert" style={{ marginBottom: '1.5rem', background: '#eff6ff', border: '1px solid #3b82f6', color: '#1e40af' }}>
                <strong>📋 Incluye:</strong> Facturas de ingresos y egresos, totales, balance
              </div>

              <div className="form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                  onClick={cargarDatosFinancieros}
                  disabled={loadingFinanciero}
                  style={{ width: '100%', marginBottom: '1rem' }}
                >
                  {loadingFinanciero ? 'Cargando...' : '🔍 Cargar Datos'}
                </button>

                {datosFinancieros.length > 0 && (
                  <div>
                    <div style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Resumen:</h3>
                      <p>📊 Total Facturas: <strong>{datosFinancieros.length}</strong></p>
                      <p>💚 Ingresos: <strong style={{ color: '#10b981' }}>Q {resumenFinanciero?.ingresos}</strong></p>
                      <p>🔴 Egresos: <strong style={{ color: '#ef4444' }}>Q {resumenFinanciero?.egresos}</strong></p>
                      <p>💰 Balance: <strong>Q {resumenFinanciero?.balance}</strong></p>
                    </div>

                    <button
                      className="btn"
                      onClick={descargarReporteFinanciero}
                      style={{ width: '100%', padding: '0.75rem' }}
                    >
                      📥 Descargar CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REPORTE ASISTENCIA */}
          {reporteActivo === 'asistencia' && (
            <div style={{ maxWidth: '800px' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>📅 Reporte de Asistencia</h2>
              
              <div className="alert" style={{ marginBottom: '1.5rem', background: '#f0fdf4', border: '1px solid #10b981', color: '#065f46' }}>
                <strong>📋 Incluye:</strong> Registro de asistencia, estadísticas de presentes/ausentes
              </div>

              <div className="form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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
                  onClick={cargarDatosAsistencia}
                  disabled={loadingAsistencia}
                  style={{ width: '100%', marginBottom: '1rem' }}
                >
                  {loadingAsistencia ? 'Cargando...' : '🔍 Cargar Datos'}
                </button>

                {datosAsistencia.length > 0 && (
                  <div>
                    <div style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Resumen:</h3>
                      <p>📊 Total Registros: <strong>{resumenAsistencia?.total_registros}</strong></p>
                      <p>✅ Presentes: <strong style={{ color: '#10b981' }}>{resumenAsistencia?.presentes}</strong></p>
                      <p>❌ Ausentes: <strong style={{ color: '#ef4444' }}>{resumenAsistencia?.ausentes}</strong></p>
                      <p>📋 Suplentes: <strong style={{ color: '#f59e0b' }}>{resumenAsistencia?.suplentes}</strong></p>
                      <p>📈 % Asistencia: <strong>{resumenAsistencia?.porcentaje_asistencia}%</strong></p>
                    </div>

                    <button
                      className="btn"
                      onClick={descargarReporteAsistencia}
                      style={{ width: '100%', padding: '0.75rem' }}
                    >
                      📥 Descargar CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REPORTE NIÑOS */}
          {reporteActivo === 'ninos' && (
            <div style={{ maxWidth: '800px' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>👶 Reporte de Niños Activos</h2>
              
              <div className="alert" style={{ marginBottom: '1.5rem', background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e' }}>
                <strong>📋 Incluye:</strong> Lista completa de niños activos, datos personales y de contacto
              </div>

              <div className="form">
                <button
                  className="btn"
                  onClick={cargarDatosNinos}
                  disabled={loadingNinos}
                  style={{ width: '100%', marginBottom: '1rem' }}
                >
                  {loadingNinos ? 'Cargando...' : '🔍 Cargar Datos'}
                </button>

                {datosNinos.length > 0 && (
                  <div>
                    <div style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Resumen:</h3>
                      <p>👶 Total Niños Activos: <strong>{datosNinos.length}</strong></p>
                    </div>

                    <button
                      className="btn"
                      onClick={descargarReporteNinos}
                      style={{ width: '100%', padding: '0.75rem' }}
                    >
                      📥 Descargar CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REPORTE INACTIVOS */}
          {reporteActivo === 'inactivos' && (
            <div style={{ maxWidth: '800px' }}>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>🚪 Reporte de Niños Inactivos</h2>
              
              <div className="alert" style={{ marginBottom: '1.5rem', background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b' }}>
                <strong>📋 Incluye:</strong> Niños que han salido del refugio con motivo de inactividad
              </div>

              <div className="form">
                <button
                  className="btn"
                  onClick={cargarDatosInactivos}
                  disabled={loadingInactivos}
                  style={{ width: '100%', marginBottom: '1rem' }}
                >
                  {loadingInactivos ? 'Cargando...' : '🔍 Cargar Datos'}
                </button>

                {datosInactivos.length > 0 && (
                  <div>
                    <div style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Resumen:</h3>
                      <p>🚪 Total Niños Inactivos: <strong>{datosInactivos.length}</strong></p>
                    </div>

                    <button
                      className="btn"
                      onClick={descargarReporteInactivos}
                      style={{ width: '100%', padding: '0.75rem' }}
                    >
                      📥 Descargar CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}