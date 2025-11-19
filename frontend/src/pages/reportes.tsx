import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface Usuario {
  id: string
  email: string
  nombres: string
  rol: string
}

export default function Reportes() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [reporteActivo, setReporteActivo] = useState<'financiero' | 'ninos' | 'actividades'>('financiero')

  // Estados Financiero
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [datosFinancieros, setDatosFinancieros] = useState<any>(null)
  const [loadingFinanciero, setLoadingFinanciero] = useState(false)

  // Estados Niños
  const [datosNinos, setDatosNinos] = useState<any>(null)
  const [loadingNinos, setLoadingNinos] = useState(false)

  // Estados Actividades
  const [mesActividades, setMesActividades] = useState(new Date().getMonth() + 1)
  const [anioActividades, setAnioActividades] = useState(new Date().getFullYear())
  const [datosActividades, setDatosActividades] = useState<any>(null)
  const [loadingActividades, setLoadingActividades] = useState(false)

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  useEffect(() => {
    cargarUsuario()
  }, [])

  async function cargarUsuario() {
    try {
      const data = await api.me()
      if (data) setUsuario(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // ========== REPORTE FINANCIERO ==========
  async function generarReporteFinanciero() {
    if (!fechaInicio || !fechaFin) {
      Swal.fire('Error', 'Debes seleccionar fechas de inicio y fin', 'error')
      return
    }

    setLoadingFinanciero(true)
    try {
      const response = await fetch(
        `https://refugio-de-amor.onrender.com/reportes/financiero?desde=${fechaInicio}&hasta=${fechaFin}`,
        { credentials: 'include' }
      )
      
      if (!response.ok) throw new Error('Error al obtener datos')
      
      const data = await response.json()
      setDatosFinancieros(data)
    } catch (error: any) {
      console.error('Error:', error)
      Swal.fire('Error', 'No se pudo generar el reporte', 'error')
    } finally {
      setLoadingFinanciero(false)
    }
  }

  function descargarPDFFinanciero() {
    if (!datosFinancieros) return

    const doc = new jsPDF()
    
    // Encabezado
    doc.setFillColor(102, 126, 234)
    doc.rect(0, 0, 210, 35, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont(undefined, 'bold')
    doc.text('Refugio de Amor', 105, 15, { align: 'center' })
    
    doc.setFontSize(16)
    doc.setFont(undefined, 'normal')
    doc.text('Reporte Financiero', 105, 25, { align: 'center' })
    
    // Período
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.text(`Período: ${fechaInicio} al ${fechaFin}`, 14, 45)
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-GT')}`, 14, 51)
    
    // Resumen
    doc.setFillColor(240, 240, 240)
    doc.rect(14, 58, 182, 25, 'F')
    
    doc.setFontSize(13)
    doc.setFont(undefined, 'bold')
    doc.text('Resumen General', 105, 66, { align: 'center' })
    
    doc.setFontSize(11)
    doc.setFont(undefined, 'normal')
    doc.text(`Total de Facturas: ${datosFinancieros.count}`, 20, 75)
    
    doc.setFont(undefined, 'bold')
    doc.setFontSize(14)
    doc.setTextColor(76, 175, 80)
    doc.text(`Total: Q${datosFinancieros.total}`, 105, 75, { align: 'center' })
    
    // Tabla de facturas
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Detalle de Facturas', 14, 93)
    
    if (datosFinancieros.facturas && datosFinancieros.facturas.length > 0) {
      doc.autoTable({
        startY: 98,
        head: [['Fecha', 'Descripción', 'Usuario', 'Monto']],
        body: datosFinancieros.facturas.map((f: any) => [
          new Date(f.fecha).toLocaleDateString('es-GT'),
          f.descripcion || 'Sin descripción',
          f.usuario_nombre || 'N/A',
          `Q${parseFloat(f.total).toFixed(2)}`
        ]),
        theme: 'striped',
        headStyles: { 
          fillColor: [102, 126, 234],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 80 },
          2: { cellWidth: 45 },
          3: { cellWidth: 30, halign: 'right' }
        }
      })
    } else {
      doc.setFont(undefined, 'normal')
      doc.setFontSize(10)
      doc.setTextColor(128, 128, 128)
      doc.text('No hay facturas en este período', 105, 105, { align: 'center' })
    }
    
    // Pie de página
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' })
    }
    
    doc.save(`reporte_financiero_${fechaInicio}_${fechaFin}.pdf`)
    Swal.fire('¡Éxito!', 'Reporte descargado correctamente', 'success')
  }

  // ========== REPORTE NIÑOS ==========
  async function generarReporteNinos() {
    setLoadingNinos(true)
    try {
      const response = await fetch(
        'https://refugio-de-amor.onrender.com/reportes/ninos',
        { credentials: 'include' }
      )
      
      if (!response.ok) throw new Error('Error al obtener datos')
      
      const data = await response.json()
      setDatosNinos(data)
    } catch (error: any) {
      console.error('Error:', error)
      Swal.fire('Error', 'No se pudo generar el reporte', 'error')
    } finally {
      setLoadingNinos(false)
    }
  }

  function descargarPDFNinos() {
    if (!datosNinos) return

    const doc = new jsPDF()
    
    // Encabezado
    doc.setFillColor(102, 126, 234)
    doc.rect(0, 0, 210, 35, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont(undefined, 'bold')
    doc.text('Refugio de Amor', 105, 15, { align: 'center' })
    
    doc.setFontSize(16)
    doc.text('Estadísticas de Niños', 105, 25, { align: 'center' })
    
    // Total de niños
    doc.setTextColor(0, 0, 0)
    doc.setFillColor(240, 248, 255)
    doc.rect(14, 45, 182, 20, 'F')
    
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('Total de Niños Activos', 105, 55, { align: 'center' })
    
    doc.setFontSize(24)
    doc.setTextColor(102, 126, 234)
    doc.text(datosNinos.totalNinos.toString(), 105, 63, { align: 'center' })
    
    doc.setTextColor(0, 0, 0)
    let currentY = 73

    // Estadísticas por Nivel
    if (datosNinos.porNivel && datosNinos.porNivel.length > 0) {
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Distribución por Nivel Educativo', 14, currentY)
      
      doc.autoTable({
        startY: currentY + 3,
        head: [['Nivel', 'Cantidad', 'Porcentaje']],
        body: datosNinos.porNivel.map((n: any) => [
          n.nivel,
          n.cantidad,
          `${((n.cantidad / datosNinos.totalNinos) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [33, 150, 243] }
      })
      
      currentY = (doc as any).lastAutoTable.finalY + 10
    }

    // Estadísticas por Género
    if (datosNinos.porGenero && datosNinos.porGenero.length > 0) {
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Distribución por Género', 14, currentY)
      
      doc.autoTable({
        startY: currentY + 3,
        head: [['Género', 'Cantidad', 'Porcentaje']],
        body: datosNinos.porGenero.map((g: any) => [
          g.genero,
          g.cantidad,
          `${((g.cantidad / datosNinos.totalNinos) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [156, 39, 176] }
      })
      
      currentY = (doc as any).lastAutoTable.finalY + 10
    }

    // Estadísticas por Edad
    if (datosNinos.porEdad && datosNinos.porEdad.length > 0) {
      doc.setFontSize(12)
      doc.setFont(undefined, 'bold')
      doc.text('Distribución por Rango de Edad', 14, currentY)
      
      doc.autoTable({
        startY: currentY + 3,
        head: [['Rango de Edad', 'Cantidad', 'Porcentaje']],
        body: datosNinos.porEdad.map((e: any) => [
          e.rango_edad,
          e.cantidad,
          `${((e.cantidad / datosNinos.totalNinos) * 100).toFixed(1)}%`
        ]),
        theme: 'striped',
        headStyles: { fillColor: [255, 152, 0] }
      })
    }

    // Lista completa de niños (nueva página)
    if (datosNinos.ninos && datosNinos.ninos.length > 0) {
      doc.addPage()
      
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Lista Completa de Niños Registrados', 14, 20)
      
      doc.autoTable({
        startY: 26,
        head: [['Código', 'Nombres', 'Apellidos', 'Edad', 'Nivel', 'Colaborador']],
        body: datosNinos.ninos.map((n: any) => [
          n.codigo,
          n.nombres,
          n.apellidos,
          n.edad ? `${n.edad} años` : 'N/A',
          n.nivel_nombre || 'Sin nivel',
          n.colaborador_nombre || 'Sin asignar'
        ]),
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 81, 181] },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 35 },
          2: { cellWidth: 35 },
          3: { cellWidth: 20 },
          4: { cellWidth: 35 },
          5: { cellWidth: 40 }
        }
      })
    }

    // Pie de página
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' })
      doc.text(`Generado: ${new Date().toLocaleDateString('es-GT')}`, 14, 290)
    }
    
    doc.save('estadisticas_ninos.pdf')
    Swal.fire('¡Éxito!', 'Reporte descargado correctamente', 'success')
  }

  // ========== REPORTE ACTIVIDADES ==========
  async function generarReporteActividades() {
    setLoadingActividades(true)
    try {
      const response = await fetch(
        `https://refugio-de-amor.onrender.com/reportes/actividades?mes=${mesActividades}&anio=${anioActividades}`,
        { credentials: 'include' }
      )
      
      if (!response.ok) throw new Error('Error al obtener datos')
      
      const data = await response.json()
      setDatosActividades(data)
    } catch (error: any) {
      console.error('Error:', error)
      Swal.fire('Error', 'No se pudo generar el reporte', 'error')
    } finally {
      setLoadingActividades(false)
    }
  }

  function descargarPDFActividades() {
    if (!datosActividades) return

    const doc = new jsPDF()
    
    // Encabezado
    doc.setFillColor(255, 87, 34)
    doc.rect(0, 0, 210, 35, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont(undefined, 'bold')
    doc.text('Refugio de Amor', 105, 15, { align: 'center' })
    
    doc.setFontSize(16)
    doc.text('Calendario de Actividades', 105, 25, { align: 'center' })
    
    // Período y total
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.text(`Mes: ${meses[mesActividades - 1]} ${anioActividades}`, 14, 47)
    doc.text(`Total de Actividades: ${datosActividades.totalActividades}`, 14, 54)
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-GT')}`, 14, 61)
    
    // Tabla de actividades
    if (datosActividades.actividades && datosActividades.actividades.length > 0) {
      doc.autoTable({
        startY: 70,
        head: [['Fecha', 'Título', 'Descripción', 'Hora']],
        body: datosActividades.actividades.map((a: any) => [
          a.fecha_formato || new Date(a.fecha).toLocaleDateString('es-GT'),
          a.titulo,
          a.descripcion || 'Sin descripción',
          a.hora || 'No especificada'
        ]),
        theme: 'grid',
        headStyles: { 
          fillColor: [255, 87, 34],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: { 
          fontSize: 9,
          cellPadding: 3
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 50 },
          2: { cellWidth: 85 },
          3: { cellWidth: 25 }
        }
      })
    } else {
      doc.setFont(undefined, 'normal')
      doc.setFontSize(11)
      doc.setTextColor(128, 128, 128)
      doc.text('No hay actividades registradas en este período', 105, 85, { align: 'center' })
    }
    
    // Pie de página
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(`Página ${i} de ${pageCount}`, 105, 290, { align: 'center' })
    }
    
    doc.save(`actividades_${meses[mesActividades - 1]}_${anioActividades}.pdf`)
    Swal.fire('¡Éxito!', 'Reporte descargado correctamente', 'success')
  }

  if (loading) return <div className="loading">Cargando...</div>

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          📊 Reportes
        </h1>
        <p style={{ color: '#6b7280' }}>Genera y descarga reportes en PDF</p>
      </div>

      {/* Pestañas */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginBottom: '2rem',
        borderBottom: '2px solid #e5e7eb',
        flexWrap: 'wrap'
      }}>
        {[
          { id: 'financiero', label: '💰 Financiero', icon: '💰' },
          { id: 'ninos', label: '👶 Niños', icon: '👶' },
          { id: 'actividades', label: '📅 Actividades', icon: '📅' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReporteActivo(tab.id as any)}
            style={{
              padding: '0.75rem 1.5rem',
              background: reporteActivo === tab.id ? '#3b82f6' : 'transparent',
              color: reporteActivo === tab.id ? 'white' : '#6b7280',
              border: 'none',
              borderBottom: reporteActivo === tab.id ? '3px solid #3b82f6' : 'none',
              cursor: 'pointer',
              fontWeight: reporteActivo === tab.id ? 'bold' : 'normal',
              fontSize: '1rem',
              transition: 'all 0.2s',
              borderRadius: '6px 6px 0 0'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REPORTE FINANCIERO */}
      {reporteActivo === 'financiero' && (
        <div className="card">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
            💰 Reporte Financiero
          </h2>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem', 
            marginBottom: '1.5rem',
            padding: '1rem',
            background: '#f9fafb',
            borderRadius: '8px'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                📅 Fecha Inicio:
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                📅 Fecha Fin:
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="form-input"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={generarReporteFinanciero}
              disabled={loadingFinanciero}
              className="btn btn-primary"
              style={{ flex: '1', minWidth: '200px' }}
            >
              {loadingFinanciero ? '⏳ Generando...' : '📊 Generar Reporte'}
            </button>

            {datosFinancieros && (
              <button
                onClick={descargarPDFFinanciero}
                className="btn"
                style={{ background: '#ef4444', color: 'white', flex: '1', minWidth: '200px' }}
>
📄 Descargar PDF
</button> 
)}
</div>
{datosFinancieros && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ 
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            color: 'white',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Total Facturas</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{datosFinancieros.count}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Monto Total</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>Q{datosFinancieros.total}</div>
              </div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Usuario</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {datosFinancieros.facturas.map((f: any) => (
                  <tr key={f.id}>
                    <td>{new Date(f.fecha).toLocaleDateString('es-GT')}</td>
                    <td>{f.descripcion || 'Sin descripción'}</td>
                    <td>{f.usuario_nombre || 'N/A'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>Q{parseFloat(f.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )}

  {/* REPORTE NIÑOS */}
  {reporteActivo === 'ninos' && (
    <div className="card">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
        👶 Estadísticas de Niños
      </h2>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <button
          onClick={generarReporteNinos}
          disabled={loadingNinos}
          className="btn btn-primary"
          style={{ flex: '1', minWidth: '200px' }}
        >
          {loadingNinos ? '⏳ Generando...' : '📊 Generar Estadísticas'}
        </button>

        {datosNinos && (
          <button
            onClick={descargarPDFNinos}
            className="btn"
            style={{ background: '#ef4444', color: 'white', flex: '1', minWidth: '200px' }}
          >
            📄 Descargar PDF
          </button>
        )}
      </div>

      {datosNinos && (
        <div>
          <div style={{ 
            padding: '2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1rem', opacity: 0.9, marginBottom: '0.5rem' }}>
              Total de Niños Activos
            </div>
            <div style={{ fontSize: '4rem', fontWeight: 'bold' }}>
              {datosNinos.totalNinos}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Por Nivel */}
            {datosNinos.porNivel && datosNinos.porNivel.length > 0 && (
              <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#1e40af' }}>
                  📚 Por Nivel
                </h3>
                {datosNinos.porNivel.map((n: any, idx: number) => (
                  <div 
                    key={idx}
                    style={{ 
                      padding: '0.75rem',
                      background: 'white',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontWeight: '500' }}>{n.nivel}</span>
                    <span style={{ 
                      background: '#3b82f6', 
                      color: 'white', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px',
                      fontWeight: 'bold',
                      fontSize: '0.875rem'
                    }}>
                      {n.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Por Género */}
            {datosNinos.porGenero && datosNinos.porGenero.length > 0 && (
              <div style={{ background: '#fce7f3', padding: '1.5rem', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#9f1239' }}>
                  👥 Por Género
                </h3>
                {datosNinos.porGenero.map((g: any, idx: number) => (
                  <div 
                    key={idx}
                    style={{ 
                      padding: '0.75rem',
                      background: 'white',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontWeight: '500' }}>{g.genero}</span>
                    <span style={{ 
                      background: '#ec4899', 
                      color: 'white', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px',
                      fontWeight: 'bold',
                      fontSize: '0.875rem'
                    }}>
                      {g.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Por Edad */}
            {datosNinos.porEdad && datosNinos.porEdad.length > 0 && (
              <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '12px' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#92400e' }}>
                  🎂 Por Edad
                </h3>
                {datosNinos.porEdad.map((e: any, idx: number) => (
                  <div 
                    key={idx}
                    style={{ 
                      padding: '0.75rem',
                      background: 'white',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span style={{ fontWeight: '500' }}>{e.rango_edad}</span>
                    <span style={{ 
                      background: '#f59e0b', 
                      color: 'white', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px',
                      fontWeight: 'bold',
                      fontSize: '0.875rem'
                    }}>
                      {e.cantidad}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lista completa */}
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
              📋 Lista Completa ({datosNinos.ninos.length} niños)
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombres</th>
                    <th>Apellidos</th>
                    <th>Edad</th>
                    <th>Nivel</th>
                    <th>Colaborador</th>
                  </tr>
                </thead>
                <tbody>
                  {datosNinos.ninos.map((n: any) => (
                    <tr key={n.id}>
                      <td><span style={{ background: '#dbeafe', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>{n.codigo}</span></td>
                      <td>{n.nombres}</td>
                      <td>{n.apellidos}</td>
                      <td>{n.edad ? `${n.edad} años` : 'N/A'}</td>
                      <td>{n.nivel_nombre || 'Sin nivel'}</td>
                      <td>{n.colaborador_nombre || 'Sin asignar'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

  {/* REPORTE ACTIVIDADES */}
  {reporteActivo === 'actividades' && (
    <div className="card">
      <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
        📅 Actividades del Mes
      </h2>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '1rem', 
        marginBottom: '1.5rem',
        padding: '1rem',
        background: '#f9fafb',
        borderRadius: '8px'
      }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
            📅 Mes:
          </label>
          <select
            value={mesActividades}
            onChange={(e) => setMesActividades(parseInt(e.target.value))}
            className="form-input"
            style={{ width: '100%' }}
          >
            {meses.map((m, idx) => (
              <option key={idx} value={idx + 1}>{m}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
            📅 Año:
          </label>
          <input
            type="number"
            value={anioActividades}
            onChange={(e) => setAnioActividades(parseInt(e.target.value))}
            className="form-input"
            style={{ width: '100%' }}
            min="2020"
            max="2030"
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={generarReporteActividades}
          disabled={loadingActividades}
          className="btn btn-primary"
          style={{ flex: '1', minWidth: '200px' }}
        >
          {loadingActividades ? '⏳ Generando...' : '📊 Generar Reporte'}
        </button>

        {datosActividades && (
          <button
            onClick={descargarPDFActividades}
            className="btn"
            style={{ background: '#ef4444', color: 'white', flex: '1', minWidth: '200px' }}
          >
            📄 Descargar PDF
          </button>
        )}
      </div>

      {datosActividades && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ 
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #ff5722 0%, #ff9800 100%)',
            borderRadius: '12px',
            color: 'white',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1rem', opacity: 0.9 }}>
              {meses[mesActividades - 1]} {anioActividades}
            </div>
            <div style={{ fontSize: '3rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
              {datosActividades.totalActividades}
            </div>
            <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
              Actividades Programadas
            </div>
          </div>

          {datosActividades.actividades && datosActividades.actividades.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Título</th>
                    <th>Descripción</th>
                    <th>Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {datosActividades.actividades.map((a: any) => (
                    <tr key={a.id}>
                      <td>
                        <span style={{ background: '#fff7ed', padding: '0.25rem 0.5rem', borderRadius: '4px', color: '#ea580c', fontWeight: '500' }}>
                          {a.fecha_formato || new Date(a.fecha).toLocaleDateString('es-GT')}
                        </span>
                      </td>
                      <td style={{ fontWeight: '600' }}>{a.titulo}</td>
                      <td>{a.descripcion || 'Sin descripción'}</td>
                      <td>{a.hora || 'No especificada'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
              <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</p>
              <p style={{ fontSize: '1.125rem' }}>
                No hay actividades registradas en este período
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )}
</div>
  )
  }