import { useState, useEffect } from 'react'
import { API_URL } from '../config'
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

  // Estados para datos
  const [datosFinancieros, setDatosFinancieros] = useState<any[]>([])
  const [resumenFinanciero, setResumenFinanciero] = useState<any>(null)
  const [datosAsistencia, setDatosAsistencia] = useState<any[]>([])
  const [resumenAsistencia, setResumenAsistencia] = useState<any>(null)
  const [datosNinos, setDatosNinos] = useState<any[]>([])
  const [datosInactivos, setDatosInactivos] = useState<any[]>([])

  // Estados para filtros
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

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  // ==================== CARGAR DATOS ====================

  async function cargarDatosFinancieros() {
    try {
      setLoadingFinanciero(true)

      const res = await fetch(
        `${API_URL}/facturas?mes=${mes}&anio=${anio}`,
        { credentials: 'include' }
      )

      if (res.ok) {
        const data = await res.json()
        console.log('📊 Facturas cargadas:', data.length)
        
        // Filtrar por mes y año en el frontend
        const filtered = data.filter((f: any) => {
          const fecha = new Date(f.creado_en)
          return fecha.getMonth() + 1 === mes && fecha.getFullYear() === anio
        })
        
        setDatosFinancieros(filtered)
        
        const ingresos = filtered.filter((f: any) => f.tipo === 'ingreso')
          .reduce((sum: number, f: any) => sum + parseFloat(f.monto), 0)
        
        const egresos = filtered.filter((f: any) => f.tipo === 'egreso')
          .reduce((sum: number, f: any) => sum + parseFloat(f.monto), 0)
        
        setResumenFinanciero({
          total_facturas: filtered.length,
          ingresos: ingresos.toFixed(2),
          egresos: egresos.toFixed(2),
          balance: (ingresos - egresos).toFixed(2)
        })
        
        Swal.fire({
          icon: 'success',
          title: '¡Datos cargados!',
          text: `${filtered.length} facturas encontradas`,
          timer: 2000,
          showConfirmButton: false
        })
      }
    } catch (error: any) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar datos financieros',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoadingFinanciero(false)
    }
  }

  async function cargarDatosAsistencia() {
    try {
      setLoadingAsistencia(true)

      const res = await fetch(`${API_URL}/asistencia`, { credentials: 'include' })

      if (res.ok) {
        const sesiones = await res.json()
        console.log('📊 Sesiones cargadas:', sesiones.length)
        
        // Obtener detalles de las sesiones del mes
        let todosRegistros: any[] = []
        
        for (const sesion of sesiones) {
          const fecha = new Date(sesion.fecha)
          if (fecha.getMonth() + 1 === mes && fecha.getFullYear() === anio) {
            try {
              const detRes = await fetch(`${API_URL}/asistencia/${sesion.id}/editar`, { credentials: 'include' })
              if (detRes.ok) {
                const detData = await detRes.json()
                todosRegistros = [...todosRegistros, ...detData.detalles]
              }
            } catch (e) {
              console.error('Error cargando sesión:', e)
            }
          }
        }
        
        setDatosAsistencia(todosRegistros)
        
        const presentes = todosRegistros.filter(a => a.estado === 'presente').length
        const ausentes = todosRegistros.filter(a => a.estado === 'ausente').length
        const suplentes = todosRegistros.filter(a => a.estado === 'suplente').length
        const porcentaje = todosRegistros.length > 0 ? ((presentes / todosRegistros.length) * 100).toFixed(2) : '0'
        
        setResumenAsistencia({
          total_registros: todosRegistros.length,
          presentes,
          ausentes,
          suplentes,
          porcentaje_asistencia: porcentaje
        })
        
        Swal.fire({
          icon: 'success',
          title: '¡Datos cargados!',
          text: `${todosRegistros.length} registros encontrados`,
          timer: 2000,
          showConfirmButton: false
        })
      }
    } catch (error: any) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar datos de asistencia',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoadingAsistencia(false)
    }
  }

  async function cargarDatosNinos() {
    try {
      setLoadingNinos(true)

      const res = await fetch(`${API_URL}/ninos`, { credentials: 'include' })

      if (res.ok) {
        const data = await res.json()
        const activos = data.filter((n: any) => n.activo !== false)
        console.log('📊 Niños activos:', activos.length)
        setDatosNinos(activos)
        
        Swal.fire({
          icon: 'success',
          title: '¡Datos cargados!',
          text: `${activos.length} niños activos`,
          timer: 2000,
          showConfirmButton: false
        })
      }
    } catch (error: any) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar datos de niños',
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
        const inactivos = data.filter((n: any) => n.activo === false)
        console.log('📊 Niños inactivos:', inactivos.length)
        setDatosInactivos(inactivos)
        
        Swal.fire({
          icon: 'success',
          title: '¡Datos cargados!',
          text: `${inactivos.length} niños inactivos`,
          timer: 2000,
          showConfirmButton: false
        })
      }
    } catch (error: any) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar datos de niños inactivos',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoadingInactivos(false)
    }
  }

  // ==================== GENERAR PDFs ====================

  function generarPDFFinanciero() {
    if (datosFinancieros.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Primero carga los datos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const doc = new jsPDF()
    
    // Título
    doc.setFontSize(18)
    doc.text('Reporte Financiero', 14, 20)
    
    doc.setFontSize(12)
    doc.text(`Período: ${meses[mes - 1]} ${anio}`, 14, 28)
    
    // Resumen
    doc.setFontSize(10)
    doc.text(`Total Facturas: ${resumenFinanciero.total_facturas}`, 14, 38)
    doc.text(`Ingresos: Q ${resumenFinanciero.ingresos}`, 14, 44)
    doc.text(`Egresos: Q ${resumenFinanciero.egresos}`, 14, 50)
    doc.text(`Balance: Q ${resumenFinanciero.balance}`, 14, 56)
    
    // Tabla
    autoTable(doc, {
      startY: 65,
      head: [['No. Factura', 'Descripción', 'Tipo', 'Monto', 'Estado']],
      body: datosFinancieros.map(f => [
        f.numero_factura,
        f.descripcion,
        f.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
        `Q ${parseFloat(f.monto).toFixed(2)}`,
        f.estado
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    })
    
    doc.save(`reporte_financiero_${mes}_${anio}.pdf`)
    
    Swal.fire({
      icon: 'success',
      title: '¡Descargado!',
      timer: 1500,
      showConfirmButton: false
    })
  }

  function generarPDFAsistencia() {
    if (datosAsistencia.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Primero carga los datos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Reporte de Asistencia', 14, 20)
    
    doc.setFontSize(12)
    doc.text(`Período: ${meses[mes - 1]} ${anio}`, 14, 28)
    
    doc.setFontSize(10)
    doc.text(`Total Registros: ${resumenAsistencia.total_registros}`, 14, 38)
    doc.text(`Presentes: ${resumenAsistencia.presentes}`, 14, 44)
    doc.text(`Ausentes: ${resumenAsistencia.ausentes}`, 14, 50)
    doc.text(`% Asistencia: ${resumenAsistencia.porcentaje_asistencia}%`, 14, 56)
    
    autoTable(doc, {
      startY: 65,
      head: [['Fecha', 'Niño', 'Estado', 'Nota']],
      body: datosAsistencia.map(a => [
        a.fecha || '',
        `${a.nino_nombre || 'N/A'}`,
        a.estado,
        a.nota || ''
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] }
    })
    
    doc.save(`reporte_asistencia_${mes}_${anio}.pdf`)
    
    Swal.fire({
      icon: 'success',
      title: '¡Descargado!',
      timer: 1500,
      showConfirmButton: false
    })
  }

  function generarPDFNinos() {
    if (datosNinos.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Primero carga los datos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Reporte de Niños Activos', 14, 20)
    
    doc.setFontSize(12)
    doc.text(`Total: ${datosNinos.length} niños`, 14, 28)
    
    autoTable(doc, {
      startY: 35,
      head: [['Código', 'Nombres', 'Apellidos', 'Edad', 'Nivel', 'Encargado']],
      body: datosNinos.map(n => [
        n.codigo || '',
        n.nombres,
        n.apellidos,
        n.edad || '',
        n.nivel_nombre || 'Sin nivel',
        n.nombre_encargado || ''
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 158, 11] }
    })
    
    doc.save(`reporte_ninos_activos_${new Date().toISOString().split('T')[0]}.pdf`)
    
    Swal.fire({
      icon: 'success',
      title: '¡Descargado!',
      timer: 1500,
      showConfirmButton: false
    })
  }

  function generarPDFInactivos() {
    if (datosInactivos.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Primero carga los datos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Reporte de Niños Inactivos', 14, 20)
    
    doc.setFontSize(12)
    doc.text(`Total: ${datosInactivos.length} niños`, 14, 28)
    
    autoTable(doc, {
      startY: 35,
      head: [['Código', 'Nombres', 'Apellidos', 'Motivo', 'Fecha Inactivación']],
      body: datosInactivos.map(n => [
        n.codigo || '',
        n.nombres,
        n.apellidos,
        n.motivo_inactividad || 'No especificado',
        n.fecha_inactivacion ? new Date(n.fecha_inactivacion).toLocaleDateString('es-GT') : ''
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] }
    })
    
    doc.save(`reporte_ninos_inactivos_${new Date().toISOString().split('T')[0]}.pdf`)
    
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
              Genera y descarga reportes en formato PDF
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
                <strong>📋 Incluye:</strong> Facturas del mes con totales
              </div>

              <div className="form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="label">Mes *</label>
                    <select className="input" value={mes} onChange={e => setMes(parseInt(e.target.value))}>
                      {meses.map((m, i) => (
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
                  onClick={cargarDatosFinancieros}
                  disabled={loadingFinanciero}
                  style={{ width: '100%', marginBottom: '1rem' }}
                >
                  {loadingFinanciero ? 'Cargando...' : '🔍 Cargar Datos'}
                </button>

                {datosFinancieros.length > 0 && (
                  <div>
                    <div style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
                      <p><strong>Facturas:</strong> {resumenFinanciero.total_facturas}</p>
                      <p style={{ color: '#10b981' }}><strong>Ingresos:</strong> Q {resumenFinanciero.ingresos}</p>
                      <p style={{ color: '#ef4444' }}><strong>Egresos:</strong> Q {resumenFinanciero.egresos}</p>
                      <p><strong>Balance:</strong> Q {resumenFinanciero.balance}</p>
                    </div>

                    <button
                      className="btn"
                      onClick={generarPDFFinanciero}
                      style={{ width: '100%' }}
                    >
                      📥 Descargar PDF
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
                <strong>📋 Incluye:</strong> Registros de asistencia del mes
              </div>

              <div className="form">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="label">Mes *</label>
                    <select className="input" value={mes} onChange={e => setMes(parseInt(e.target.value))}>
                      {meses.map((m, i) => (
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
                      <p><strong>Total:</strong> {resumenAsistencia.total_registros}</p>
                      <p style={{ color: '#10b981' }}><strong>Presentes:</strong> {resumenAsistencia.presentes}</p>
                      <p style={{ color: '#ef4444' }}><strong>Ausentes:</strong> {resumenAsistencia.ausentes}</p>
                      <p><strong>% Asistencia:</strong> {resumenAsistencia.porcentaje_asistencia}%</p>
                    </div>

                    <button
                      className="btn"
                      onClick={generarPDFAsistencia}
                      style={{ width: '100%' }}
                    >
                      📥 Descargar PDF
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
                <strong>📋 Incluye:</strong> Lista completa de niños activos
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
                      <p><strong>Total Niños Activos:</strong> {datosNinos.length}</p>
                    </div>

                    <button
                      className="btn"
                      onClick={generarPDFNinos}
                      style={{ width: '100%' }}
                    >
                      📥 Descargar PDF
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
                <strong>📋 Incluye:</strong> Niños inactivos con motivo
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
                      <p><strong>Total Niños Inactivos:</strong> {datosInactivos.length}</p>
                    </div>

                    <button
                      className="btn"
                      onClick={generarPDFInactivos}
                      style={{ width: '100%' }}
                    >
                      📥 Descargar PDF
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