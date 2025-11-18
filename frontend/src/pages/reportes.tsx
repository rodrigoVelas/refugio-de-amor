import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Extender el tipo jsPDF para autoTable
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

  // Estados para Reporte Financiero
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [datosFinancieros, setDatosFinancieros] = useState<any>(null)
  const [loadingFinanciero, setLoadingFinanciero] = useState(false)

  // Estados para Reporte Niños
  const [datosNinos, setDatosNinos] = useState<any>(null)
  const [loadingNinos, setLoadingNinos] = useState(false)

  // Estados para Reporte Actividades
  const [mesActividades, setMesActividades] = useState(new Date().getMonth() + 1)
  const [anioActividades, setAnioActividades] = useState(new Date().getFullYear())
  const [datosActividades, setDatosActividades] = useState<any>(null)
  const [loadingActividades, setLoadingActividades] = useState(false)

  useEffect(() => {
    cargarUsuario()
  }, [])

  async function cargarUsuario() {
    try {
      const data = await api.me()
      if (data) {
        setUsuario(data)
      }
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
    
    // Título
    doc.setFontSize(18)
    doc.text('Reporte Financiero', 14, 20)
    
    // Período
    doc.setFontSize(12)
    doc.text(`Período: ${fechaInicio} a ${fechaFin}`, 14, 30)
    
    // Resumen
    doc.setFontSize(14)
    doc.text('Resumen:', 14, 40)
    doc.setFontSize(11)
    doc.text(`Total Ingresos: Q${datosFinancieros.totalIngresos}`, 14, 48)
    doc.text(`Total Egresos: Q${datosFinancieros.totalEgresos}`, 14, 54)
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text(`Balance: Q${datosFinancieros.balance}`, 14, 62)
    doc.setFont(undefined, 'normal')
    
    // Tabla de Ingresos
    if (datosFinancieros.ingresos && datosFinancieros.ingresos.length > 0) {
      doc.setFontSize(13)
      doc.text('Ingresos:', 14, 72)
      
      doc.autoTable({
        startY: 76,
        head: [['Fecha', 'No. Factura', 'Descripción', 'Monto']],
        body: datosFinancieros.ingresos.map((f: any) => [
          f.fecha,
          f.numero_factura || '-',
          f.descripcion || '-',
          `Q${parseFloat(f.monto).toFixed(2)}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [76, 175, 80] }
      })
    }
    
    // Tabla de Egresos
    if (datosFinancieros.egresos && datosFinancieros.egresos.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 80
      
      doc.setFontSize(13)
      doc.text('Egresos:', 14, finalY + 10)
      
      doc.autoTable({
        startY: finalY + 14,
        head: [['Fecha', 'No. Factura', 'Descripción', 'Monto']],
        body: datosFinancieros.egresos.map((f: any) => [
          f.fecha,
          f.numero_factura || '-',
          f.descripcion || '-',
          `Q${parseFloat(f.monto).toFixed(2)}`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [244, 67, 54] }
      })
    }
    
    doc.save(`reporte_financiero_${fechaInicio}_${fechaFin}.pdf`)
    Swal.fire('¡Éxito!', 'Reporte descargado correctamente', 'success')
  }

  // ========== REPORTE NIÑOS (ESTADÍSTICAS) ==========
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
    
    // Título
    doc.setFontSize(18)
    doc.text('Estadísticas de Niños', 14, 20)
    
    // Total de niños
    doc.setFontSize(14)
    doc.text(`Total de Niños Activos: ${datosNinos.totalNinos}`, 14, 32)
    
    let currentY = 40

    // Estadísticas por Nivel
    if (datosNinos.porNivel && datosNinos.porNivel.length > 0) {
      doc.setFontSize(13)
      doc.text('Distribución por Nivel:', 14, currentY)
      
      doc.autoTable({
        startY: currentY + 4,
        head: [['Nivel', 'Cantidad']],
        body: datosNinos.porNivel.map((n: any) => [
          n.nivel || 'Sin nivel',
          n.cantidad
        ]),
        theme: 'grid',
        headStyles: { fillColor: [33, 150, 243] }
      })
      
      currentY = (doc as any).lastAutoTable.finalY + 10
    }

    // Estadísticas por Género
    if (datosNinos.porGenero && datosNinos.porGenero.length > 0) {
      doc.setFontSize(13)
      doc.text('Distribución por Género:', 14, currentY)
      
      doc.autoTable({
        startY: currentY + 4,
        head: [['Género', 'Cantidad']],
        body: datosNinos.porGenero.map((g: any) => [
          g.genero,
          g.cantidad
        ]),
        theme: 'grid',
        headStyles: { fillColor: [156, 39, 176] }
      })
      
      currentY = (doc as any).lastAutoTable.finalY + 10
    }

    // Estadísticas por Edad
    if (datosNinos.porEdad && datosNinos.porEdad.length > 0) {
      doc.setFontSize(13)
      doc.text('Distribución por Edad:', 14, currentY)
      
      doc.autoTable({
        startY: currentY + 4,
        head: [['Rango de Edad', 'Cantidad']],
        body: datosNinos.porEdad.map((e: any) => [
          e.rango_edad,
          e.cantidad
        ]),
        theme: 'grid',
        headStyles: { fillColor: [255, 152, 0] }
      })
    }

    // Lista completa de niños
    if (datosNinos.ninos && datosNinos.ninos.length > 0) {
      doc.addPage()
      doc.setFontSize(16)
      doc.text('Lista Completa de Niños', 14, 20)
      
      doc.autoTable({
        startY: 26,
        head: [['Código', 'Nombres', 'Apellidos', 'Edad', 'Nivel', 'Colaborador']],
        body: datosNinos.ninos.map((n: any) => [
          n.codigo,
          n.nombres,
          n.apellidos,
          n.edad || '-',
          n.nivel_nombre || '-',
          n.colaborador || 'Sin asignar'
        ]),
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [63, 81, 181] }
      })
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
    
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    
    // Título
    doc.setFontSize(18)
    doc.text('Reporte de Actividades', 14, 20)
    
    // Período
    doc.setFontSize(12)
    doc.text(`Mes: ${meses[mesActividades - 1]} ${anioActividades}`, 14, 30)
    doc.text(`Total de Actividades: ${datosActividades.totalActividades}`, 14, 38)
    
    // Tabla de actividades
    if (datosActividades.actividades && datosActividades.actividades.length > 0) {
      doc.autoTable({
        startY: 46,
        head: [['Fecha', 'Título', 'Descripción', 'Hora']],
        body: datosActividades.actividades.map((a: any) => [
          new Date(a.fecha).toLocaleDateString('es-GT'),
          a.titulo,
          a.descripcion || '-',
          a.hora || '-'
        ]),
        theme: 'grid',
        headStyles: { fillColor: [255, 87, 34] },
        styles: { fontSize: 10 }
      })
    } else {
      doc.setFontSize(11)
      doc.text('No hay actividades registradas en este período', 14, 50)
    }
    
    doc.save(`actividades_${meses[mesActividades - 1]}_${anioActividades}.pdf`)
    Swal.fire('¡Éxito!', 'Reporte descargado correctamente', 'success')
  }

  if (loading) {
    return <div className="loading">Cargando...</div>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>
        📊 Reportes
      </h1>

      {/* Pestañas */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        borderBottom: '2px solid #e5e7eb'
      }}>
        <button
          onClick={() => setReporteActivo('financiero')}
          style={{
            padding: '0.75rem 1.5rem',
            background: reporteActivo === 'financiero' ? '#3b82f6' : 'transparent',
            color: reporteActivo === 'financiero' ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: reporteActivo === 'financiero' ? '3px solid #3b82f6' : 'none',
            cursor: 'pointer',
            fontWeight: reporteActivo === 'financiero' ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          💰 Financiero
        </button>
        
        <button
          onClick={() => setReporteActivo('ninos')}
          style={{
            padding: '0.75rem 1.5rem',
            background: reporteActivo === 'ninos' ? '#3b82f6' : 'transparent',
            color: reporteActivo === 'ninos' ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: reporteActivo === 'ninos' ? '3px solid #3b82f6' : 'none',
            cursor: 'pointer',
            fontWeight: reporteActivo === 'ninos' ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          👶 Estadísticas de Niños
        </button>

        <button
          onClick={() => setReporteActivo('actividades')}
          style={{
            padding: '0.75rem 1.5rem',
            background: reporteActivo === 'actividades' ? '#3b82f6' : 'transparent',
            color: reporteActivo === 'actividades' ? 'white' : '#6b7280',
            border: 'none',
            borderBottom: reporteActivo === 'actividades' ? '3px solid #3b82f6' : 'none',
            cursor: 'pointer',
            fontWeight: reporteActivo === 'actividades' ? 'bold' : 'normal',
            transition: 'all 0.2s'
          }}
        >
          📅 Actividades del Mes
        </button>
      </div>

      {/* REPORTE FINANCIERO */}
      {reporteActivo === 'financiero' && (
        <div className="card">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            Reporte Financiero
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Fecha Inicio:
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
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Fecha Fin:
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

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={generarReporteFinanciero}
              disabled={loadingFinanciero}
              className="btn btn-primary"
            >
              {loadingFinanciero ? 'Generando...' : '📊 Generar Reporte'}
            </button>

            {datosFinancieros && (
              <button
                onClick={descargarPDFFinanciero}
                className="btn"
                style={{ background: '#ef4444', color: 'white' }}
              >
                📄 Descargar PDF
              </button>
            )}
          </div>

          {datosFinancieros && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(3, 1fr)', 
                gap: '1rem',
                marginBottom: '2rem'
              }}>
                <div style={{ 
                  padding: '1rem', 
                  background: '#dcfce7', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#166534' }}>Total Ingresos</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#15803d' }}>
                    Q{datosFinancieros.totalIngresos}
                  </div>
                </div>

                <div style={{ 
                  padding: '1rem', 
                  background: '#fee2e2', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#991b1b' }}>Total Egresos</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>
                    Q{datosFinancieros.totalEgresos}
                  </div>
                </div>

                <div style={{ 
                  padding: '1rem', 
                  background: parseFloat(datosFinancieros.balance) >= 0 ? '#dbeafe' : '#fee2e2', 
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '0.875rem', color: parseFloat(datosFinancieros.balance) >= 0 ? '#1e3a8a' : '#991b1b' }}>
                    Balance
                  </div>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: 'bold', 
                    color: parseFloat(datosFinancieros.balance) >= 0 ? '#2563eb' : '#dc2626'
                  }}>
                    Q{datosFinancieros.balance}
                  </div>
                </div>
              </div>

              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Total de registros: {datosFinancieros.count}
              </p>
            </div>
          )}
        </div>
      )}

      {/* REPORTE NIÑOS */}
      {reporteActivo === 'ninos' && (
        <div className="card">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            Estadísticas de Niños
          </h2>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={generarReporteNinos}
              disabled={loadingNinos}
              className="btn btn-primary"
            >
              {loadingNinos ? 'Generando...' : '📊 Generar Estadísticas'}
            </button>

            {datosNinos && (
              <button
                onClick={descargarPDFNinos}
                className="btn"
                style={{ background: '#ef4444', color: 'white' }}
              >
                📄 Descargar PDF
              </button>
            )}
          </div>

          {datosNinos && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ 
                padding: '1.5rem', 
                background: '#f0f9ff', 
                borderRadius: '8px',
                marginBottom: '2rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1rem', color: '#0369a1', marginBottom: '0.5rem' }}>
                  Total de Niños Activos
                </div>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#0284c7' }}>
                  {datosNinos.totalNinos}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                {/* Por Nivel */}
                {datosNinos.porNivel && datosNinos.porNivel.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                      Por Nivel
                    </h3>
                    {datosNinos.porNivel.map((n: any, idx: number) => (
                      <div 
                        key={idx}
                        style={{ 
                          padding: '0.75rem',
                          background: '#f3f4f6',
                          borderRadius: '6px',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>{n.nivel || 'Sin nivel'}</span>
                        <span style={{ fontWeight: 'bold' }}>{n.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Por Género */}
                {datosNinos.porGenero && datosNinos.porGenero.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                      Por Género
                    </h3>
                    {datosNinos.porGenero.map((g: any, idx: number) => (
                      <div 
                        key={idx}
                        style={{ 
                          padding: '0.75rem',
                          background: '#fce7f3',
                          borderRadius: '6px',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>{g.genero}</span>
                        <span style={{ fontWeight: 'bold' }}>{g.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Por Edad */}
                {datosNinos.porEdad && datosNinos.porEdad.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                      Por Edad
                    </h3>
                    {datosNinos.porEdad.map((e: any, idx: number) => (
                      <div 
                        key={idx}
                        style={{ 
                          padding: '0.75rem',
                          background: '#fef3c7',
                          borderRadius: '6px',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          justifyContent: 'space-between'
                        }}
                      >
                        <span>{e.rango_edad}</span>
                        <span style={{ fontWeight: 'bold' }}>{e.cantidad}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORTE ACTIVIDADES */}
      {reporteActivo === 'actividades' && (
        <div className="card">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
            Actividades del Mes
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Mes:
              </label>
              <select
                value={mesActividades}
                onChange={(e) => setMesActividades(parseInt(e.target.value))}
                className="form-input"
                style={{ width: '100%' }}
              >
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Año:
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

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={generarReporteActividades}
              disabled={loadingActividades}
              className="btn btn-primary"
            >
              {loadingActividades ? 'Generando...' : '📊 Generar Reporte'}
            </button>

            {datosActividades && (
              <button
                onClick={descargarPDFActividades}
                className="btn"
                style={{ background: '#ef4444', color: 'white' }}
              >
                📄 Descargar PDF
              </button>
            )}
          </div>

          {datosActividades && (
            <div style={{ marginTop: '2rem' }}>
              <div style={{ 
                padding: '1rem', 
                background: '#fef3c7', 
                borderRadius: '8px',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '1rem', color: '#78350f' }}>Total de Actividades</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#92400e' }}>
                  {datosActividades.totalActividades}
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
                          <td>{new Date(a.fecha).toLocaleDateString('es-GT')}</td>
                          <td>{a.titulo}</td>
                          <td>{a.descripcion || '-'}</td>
                          <td>{a.hora || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                  No hay actividades registradas en este período
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}