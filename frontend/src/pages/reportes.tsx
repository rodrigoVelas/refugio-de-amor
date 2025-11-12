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

  // ==================== CARGAR DATOS FINANCIEROS ====================

  async function cargarDatosFinancieros() {
    try {
      setLoadingFinanciero(true)
      console.log('💰 Cargando datos financieros...')
      console.log('   Mes:', mes, 'Año:', anio)

      const res = await fetch(`${API_URL}/facturas`, { credentials: 'include' })

      if (!res.ok) {
        throw new Error('Error al cargar facturas')
      }

      const todasFacturas = await res.json()
      console.log('   Total facturas en BD:', todasFacturas.length)
      
      if (todasFacturas.length > 0) {
        console.log('   Primera factura ejemplo:', todasFacturas[0])
      }

      // Filtrar por mes y año
      const filtered = todasFacturas.filter((f: any) => {
        const fecha = new Date(f.creado_en)
        return fecha.getMonth() + 1 === mes && fecha.getFullYear() === anio
      })

      console.log('   Facturas filtradas:', filtered.length)
      
      setDatosFinancieros(filtered)
      
      // Calcular SOLO total de ingresos
      let totalIngresos = 0

      filtered.forEach((f: any) => {
        const monto = parseFloat(f.monto || f.cantidad || f.total || 0)
        console.log(`   Factura ${f.numero_factura}: monto=${monto}`)
        totalIngresos += monto
      })

      console.log('   📊 Total calculado:')
      console.log('      Total Ingresos:', totalIngresos)
      
      setResumenFinanciero({
        total_facturas: filtered.length,
        total_ingresos: totalIngresos.toFixed(2)
      })
      
      if (filtered.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'Sin datos',
          text: `No hay facturas para ${meses[mes - 1]} ${anio}`,
          confirmButtonColor: '#3b82f6'
        })
      } else {
        Swal.fire({
          icon: 'success',
          title: '¡Datos cargados!',
          html: `
            <div style="text-align: left; padding: 1rem;">
              <p><strong>📊 Total Facturas:</strong> ${filtered.length}</p>
              <p style="color: #10b981; font-size: 1.25rem; margin-top: 0.5rem;">
                <strong>💰 Total Ingresos:</strong> Q ${totalIngresos.toFixed(2)}
              </p>
            </div>
          `,
          timer: 3000,
          showConfirmButton: false
        })
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

  // ==================== CARGAR DATOS ASISTENCIA ====================

  async function cargarDatosAsistencia() {
    try {
      setLoadingAsistencia(true)
      console.log('📅 Cargando datos de asistencia...')
      console.log('   Mes:', mes, 'Año:', anio)

      const sesionesRes = await fetch(`${API_URL}/asistencia`, { credentials: 'include' })

      if (!sesionesRes.ok) {
        throw new Error('Error al cargar sesiones')
      }

      const sesiones = await sesionesRes.json()
      console.log('   Total sesiones en BD:', sesiones.length)

      // Filtrar sesiones del mes
      const sesionesFiltradas = sesiones.filter((s: any) => {
        const fecha = new Date(s.fecha)
        return fecha.getMonth() + 1 === mes && fecha.getFullYear() === anio
      })

      console.log('   Sesiones del mes:', sesionesFiltradas.length)

      if (sesionesFiltradas.length === 0) {
        setDatosAsistencia([])
        setResumenAsistencia({
          total_registros: 0,
          presentes: 0,
          ausentes: 0,
          suplentes: 0,
          porcentaje_asistencia: '0'
        })

        Swal.fire({
          icon: 'info',
          title: 'Sin datos',
          text: `No hay sesiones de asistencia para ${meses[mes - 1]} ${anio}`,
          confirmButtonColor: '#3b82f6'
        })
        return
      }

      // Cargar detalles de cada sesión
      const todosRegistros: any[] = []

      for (const sesion of sesionesFiltradas) {
        try {
          console.log('   Cargando sesión:', sesion.id)
          const detRes = await fetch(`${API_URL}/asistencia/${sesion.id}/editar`, { 
            credentials: 'include' 
          })

          if (detRes.ok) {
            const detData = await detRes.json()
            console.log('   Detalles recibidos:', detData)
            
            if (detData.detalles && Array.isArray(detData.detalles)) {
              const registrosConFecha = detData.detalles.map((d: any) => ({
                ...d,
                fecha: sesion.fecha,
                fecha_formato: new Date(sesion.fecha).toLocaleDateString('es-GT')
              }))
              
              todosRegistros.push(...registrosConFecha)
              console.log('      ✓ Agregados', registrosConFecha.length, 'registros')
            }
          } else {
            console.log('      ⚠️ Error al cargar sesión')
          }
        } catch (error) {
          console.error('      ❌ Error:', error)
        }
      }

      console.log('   📊 Total registros cargados:', todosRegistros.length)

      if (todosRegistros.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Sin registros',
          text: 'Las sesiones no tienen registros de asistencia',
          confirmButtonColor: '#3b82f6'
        })
        setDatosAsistencia([])
        return
      }

      setDatosAsistencia(todosRegistros)

      // Calcular estadísticas
      const presentes = todosRegistros.filter(a => a.estado === 'presente').length
      const ausentes = todosRegistros.filter(a => a.estado === 'ausente').length
      const suplentes = todosRegistros.filter(a => a.estado === 'suplente').length
      const porcentaje = todosRegistros.length > 0 
        ? ((presentes / todosRegistros.length) * 100).toFixed(2) 
        : '0'

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
        html: `
          <div style="text-align: left; padding: 1rem;">
            <p><strong>📊 Total registros:</strong> ${todosRegistros.length}</p>
            <p style="color: #10b981;"><strong>✅ Presentes:</strong> ${presentes}</p>
            <p style="color: #ef4444;"><strong>❌ Ausentes:</strong> ${ausentes}</p>
            <p><strong>📝 Suplentes:</strong> ${suplentes}</p>
            <p><strong>📈 % Asistencia:</strong> ${porcentaje}%</p>
          </div>
        `,
        timer: 3000,
        showConfirmButton: false
      })

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

  // ==================== CARGAR DATOS NIÑOS ====================

  async function cargarDatosNinos() {
    try {
      setLoadingNinos(true)
      console.log('👶 Cargando niños activos...')

      const res = await fetch(`${API_URL}/ninos`, { credentials: 'include' })

      if (!res.ok) {
        throw new Error('Error al cargar niños')
      }

      const data = await res.json()
      const activos = data.filter((n: any) => n.activo !== false)
      
      console.log('   Niños activos:', activos.length)
      setDatosNinos(activos)
      
      Swal.fire({
        icon: 'success',
        title: '¡Datos cargados!',
        text: `${activos.length} niños activos encontrados`,
        timer: 2000,
        showConfirmButton: false
      })
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

  // ==================== CARGAR DATOS INACTIVOS ====================

  async function cargarDatosInactivos() {
    try {
      setLoadingInactivos(true)
      console.log('🚪 Cargando niños inactivos...')

      const res = await fetch(`${API_URL}/ninos`, { credentials: 'include' })

      if (!res.ok) {
        throw new Error('Error al cargar niños')
      }

      const data = await res.json()
      console.log('   Total niños en BD:', data.length)
      
      const inactivos = data.filter((n: any) => n.activo === false)
      console.log('   Niños inactivos:', inactivos.length)
      
      if (inactivos.length > 0) {
        console.log('   Primer niño inactivo:', inactivos[0])
      }
      
      setDatosInactivos(inactivos)
      
      Swal.fire({
        icon: 'success',
        title: '¡Datos cargados!',
        text: `${inactivos.length} niños inactivos encontrados`,
        timer: 2000,
        showConfirmButton: false
      })
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

  // ==================== GENERAR PDFs ====================

  function generarPDFFinanciero() {
    if (datosFinancieros.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Primero carga los datos financieros',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Reporte Financiero', 14, 20)
    
    doc.setFontSize(12)
    doc.text(`Período: ${meses[mes - 1]} ${anio}`, 14, 28)
    
    doc.setFontSize(10)
    doc.text(`Total Facturas: ${resumenFinanciero.total_facturas}`, 14, 38)
    doc.setTextColor(16, 185, 129)
    doc.setFontSize(14)
    doc.text(`TOTAL INGRESOS: Q ${resumenFinanciero.total_ingresos}`, 14, 48)
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    
    autoTable(doc, {
      startY: 58,
      head: [['No. Factura', 'Descripción', 'Monto']],
      body: datosFinancieros.map(f => {
        const monto = parseFloat(f.monto || f.cantidad || f.total || 0)
        return [
          f.numero_factura || 'N/A',
          (f.descripcion || '').substring(0, 50),
          `Q ${monto.toFixed(2)}`
        ]
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      foot: [[
        '',
        'TOTAL:',
        `Q ${resumenFinanciero.total_ingresos}`
      ]],
      footStyles: { 
        fillColor: [16, 185, 129],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      }
    })
    
    doc.save(`reporte_financiero_${meses[mes - 1]}_${anio}.pdf`)
    
    Swal.fire({
      icon: 'success',
      title: '¡PDF Descargado!',
      text: `Reporte de ${datosFinancieros.length} facturas`,
      timer: 2000,
      showConfirmButton: false
    })
  }

  function generarPDFAsistencia() {
    if (datosAsistencia.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Primero carga los datos de asistencia',
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
    doc.setTextColor(16, 185, 129)
    doc.text(`Presentes: ${resumenAsistencia.presentes} (${resumenAsistencia.porcentaje_asistencia}%)`, 14, 44)
    doc.setTextColor(239, 68, 68)
    doc.text(`Ausentes: ${resumenAsistencia.ausentes}`, 14, 50)
    doc.setTextColor(0, 0, 0)
    doc.text(`Suplentes: ${resumenAsistencia.suplentes}`, 14, 56)
    
    autoTable(doc, {
      startY: 65,
      head: [['Fecha', 'Niño', 'Estado', 'Nota']],
      body: datosAsistencia.map(a => [
        a.fecha_formato || new Date(a.fecha).toLocaleDateString('es-GT'),
        a.nino_nombre || a.nombres || 'N/A',
        a.estado === 'presente' ? 'Presente' : 
        a.estado === 'ausente' ? 'Ausente' : 
        a.estado === 'suplente' ? 'Suplente' : a.estado,
        (a.nota || '').substring(0, 40)
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [16, 185, 129] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 60 },
        2: { cellWidth: 25 },
        3: { cellWidth: 'auto' }
      }
    })
    
    doc.save(`reporte_asistencia_${meses[mes - 1]}_${anio}.pdf`)
    
    Swal.fire({
      icon: 'success',
      title: '¡PDF Descargado!',
      text: `Reporte de ${datosAsistencia.length} registros`,
      timer: 2000,
      showConfirmButton: false
    })
  }

  function generarPDFNinos() {
    if (datosNinos.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Primero carga los datos de niños activos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Reporte de Niños Activos', 14, 20)
    
    doc.setFontSize(12)
    doc.text(`Total: ${datosNinos.length} niños`, 14, 28)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-GT')}`, 14, 34)
    
    autoTable(doc, {
      startY: 42,
      head: [['Código', 'Nombres', 'Apellidos', 'Edad', 'Nivel', 'Encargado']],
      body: datosNinos.map(n => [
        n.codigo || 'N/A',
        n.nombres || 'N/A',
        n.apellidos || 'N/A',
        n.edad ? `${n.edad} años` : 'N/A',
        n.nivel_nombre || 'Sin nivel',
        n.nombre_encargado || 'N/A'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [245, 158, 11] }
    })
    
    doc.save(`reporte_ninos_activos_${new Date().toISOString().split('T')[0]}.pdf`)
    
    Swal.fire({
      icon: 'success',
      title: '¡PDF Descargado!',
      text: `Reporte de ${datosNinos.length} niños activos`,
      timer: 2000,
      showConfirmButton: false
    })
  }

  function generarPDFInactivos() {
    if (datosInactivos.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Sin datos',
        text: 'Primero carga los datos de niños inactivos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const doc = new jsPDF()
    
    doc.setFontSize(18)
    doc.text('Reporte de Niños Inactivos', 14, 20)
    
    doc.setFontSize(12)
    doc.text(`Total: ${datosInactivos.length} niños`, 14, 28)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-GT')}`, 14, 34)
    
    autoTable(doc, {
      startY: 42,
      head: [['Código', 'Nombres', 'Apellidos', 'Motivo', 'Fecha Inactivación']],
      body: datosInactivos.map(n => [
        n.codigo || 'N/A',
        n.nombres || 'N/A',
        n.apellidos || 'N/A',
        (n.motivo_inactividad || 'No especificado').substring(0, 30),
        n.fecha_inactivacion ? new Date(n.fecha_inactivacion).toLocaleDateString('es-GT') : 'N/A'
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] }
    })
    
    doc.save(`reporte_ninos_inactivos_${new Date().toISOString().split('T')[0]}.pdf`)
    
    Swal.fire({
      icon: 'success',
      title: '¡PDF Descargado!',
      text: `Reporte de ${datosInactivos.length} niños inactivos`,
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
                <strong>📋 Incluye:</strong> Total de ingresos de todas las facturas del mes
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

                {datosFinancieros.length > 0 && resumenFinanciero && (
                  <div>
                    <div style={{ 
                      padding: '1.5rem', 
                      background: 'var(--surface-elevated)', 
                      borderRadius: 'var(--radius)', 
                      marginBottom: '1rem',
                      border: '2px solid #10b981',
                      textAlign: 'center'
                    }}>
                      <p style={{ marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <strong>📊 Total Facturas:</strong> {resumenFinanciero.total_facturas}
                      </p>
                      <p style={{ 
                        color: '#10b981', 
                        fontWeight: '700', 
                        fontSize: '2rem',
                        margin: '1rem 0'
                      }}>
                        Q {resumenFinanciero.total_ingresos}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        Total de Ingresos
                      </p>
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
                <strong>📋 Incluye:</strong> Todos los registros de asistencia del mes seleccionado
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
</div> <button
              className="btn"
              onClick={cargarDatosAsistencia}
              disabled={loadingAsistencia}
              style={{ width: '100%', marginBottom: '1rem' }}
            >
              {loadingAsistencia ? 'Cargando...' : '🔍 Cargar Datos'}
            </button>

            {datosAsistencia.length > 0 && resumenAsistencia && (
              <div>
                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--surface-elevated)', 
                  borderRadius: 'var(--radius)', 
                  marginBottom: '1rem',
                  border: '1px solid var(--border)'
                }}>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong>📊 Total:</strong> {resumenAsistencia.total_registros}
                  </p>
                  <p style={{ color: '#10b981', marginBottom: '0.5rem' }}>
                    <strong>✅ Presentes:</strong> {resumenAsistencia.presentes}
                  </p>
                  <p style={{ color: '#ef4444', marginBottom: '0.5rem' }}>
                    <strong>❌ Ausentes:</strong> {resumenAsistencia.ausentes}
                  </p>
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong>📝 Suplentes:</strong> {resumenAsistencia.suplentes}
                  </p>
                  <p style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                    <strong>📈 % Asistencia:</strong> {resumenAsistencia.porcentaje_asistencia}%
                  </p>
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

      {/* REPORTE NIÑOS ACTIVOS */}
      {reporteActivo === 'ninos' && (
        <div style={{ maxWidth: '800px' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>👶 Reporte de Niños Activos</h2>
          
          <div className="alert" style={{ marginBottom: '1.5rem', background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e' }}>
            <strong>📋 Incluye:</strong> Lista completa de todos los niños activos con sus datos
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
                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--surface-elevated)', 
                  borderRadius: 'var(--radius)', 
                  marginBottom: '1rem',
                  border: '1px solid var(--border)'
                }}>
                  <p style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                    <strong>👶 Total Niños Activos:</strong> {datosNinos.length}
                  </p>
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

      {/* REPORTE NIÑOS INACTIVOS */}
      {reporteActivo === 'inactivos' && (
        <div style={{ maxWidth: '800px' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>🚪 Reporte de Niños Inactivos</h2>
          
          <div className="alert" style={{ marginBottom: '1.5rem', background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b' }}>
            <strong>📋 Incluye:</strong> Todos los niños inactivos con motivo de salida
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
                <div style={{ 
                  padding: '1rem', 
                  background: 'var(--surface-elevated)', 
                  borderRadius: 'var(--radius)', 
                  marginBottom: '1rem',
                  border: '1px solid var(--border)'
                }}>
                  <p style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                    <strong>🚪 Total Niños Inactivos:</strong> {datosInactivos.length}
                  </p>
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