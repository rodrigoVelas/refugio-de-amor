import { useState, useEffect } from 'react'
import { API_URL } from '../config'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

interface Usuario {
  id: string
  email: string
  nombres: string
  rol: string
}

export default function Reportes() {
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [reporteActivo, setReporteActivo] = useState<'financiero' | 'asistencia' | 'ninos'>('financiero')

  // Estados para Reporte Financiero
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [datosFinancieros, setDatosFinancieros] = useState<any>(null)
  const [loadingFinanciero, setLoadingFinanciero] = useState(false)

  // Estados para Reporte Asistencia
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [datosAsistencia, setDatosAsistencia] = useState<any>(null)
  const [loadingAsistencia, setLoadingAsistencia] = useState(false)

  // Estados para Reporte Niños
  const [datosNinos, setDatosNinos] = useState<any>(null)
  const [loadingNinos, setLoadingNinos] = useState(false)

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

  // ==================== REPORTE FINANCIERO ====================
  async function generarReporteFinanciero() {
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
        setDatosFinancieros(data)
      } else {
        const error = await res.json()
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error,
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al generar reporte',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoadingFinanciero(false)
    }
  }

  function descargarExcelFinanciero() {
    if (!datosFinancieros) return

    const datosExcel = datosFinancieros.facturas.map((f: any) => ({
      'No. Factura': f.numero_factura,
      'Descripción': f.descripcion,
      'Tipo': f.tipo === 'ingreso' ? 'Ingreso' : 'Egreso',
      'Monto (Q)': parseFloat(f.monto).toFixed(2),
      'Estado': f.estado,
      'Fecha Emisión': new Date(f.fecha_emision).toLocaleDateString('es-GT'),
      'Fecha Vencimiento': f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toLocaleDateString('es-GT') : '',
      'Fecha Subida': new Date(f.creado_en).toLocaleDateString('es-GT'),
      'Creado Por': f.creado_por_nombre
    }))

    // Agregar resumen al final
    datosExcel.push({})
    datosExcel.push({ 'No. Factura': 'RESUMEN' })
    datosExcel.push({ 'No. Factura': 'Total Ingresos', 'Monto (Q)': `Q ${datosFinancieros.resumen.ingresos}` })
    datosExcel.push({ 'No. Factura': 'Total Egresos', 'Monto (Q)': `Q ${datosFinancieros.resumen.egresos}` })
    datosExcel.push({ 'No. Factura': 'Balance', 'Monto (Q)': `Q ${datosFinancieros.resumen.balance}` })

    const ws = XLSX.utils.json_to_sheet(datosExcel)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Financiero')

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `Reporte_Financiero_${fechaInicio}_${fechaFin}.xlsx`)
  }

  // ==================== REPORTE ASISTENCIA ====================
  async function generarReporteAsistencia() {
    try {
      setLoadingAsistencia(true)

      const res = await fetch(
        `${API_URL}/reportes/asistencia?mes=${mes}&anio=${anio}`,
        { credentials: 'include' }
      )

      if (res.ok) {
        const data = await res.json()
        setDatosAsistencia(data)
      } else {
        const error = await res.json()
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error,
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al generar reporte',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoadingAsistencia(false)
    }
  }

  function descargarExcelAsistencia() {
    if (!datosAsistencia) return

    const datosExcel = datosAsistencia.asistencias.map((a: any) => ({
      'Fecha': new Date(a.fecha).toLocaleDateString('es-GT'),
      'Niño': a.nino_nombre,
      'Nivel': a.nivel_nombre || 'Sin nivel',
      'Subnivel': a.subnivel_nombre || 'Sin subnivel',
      'Estado': a.estado === 'presente' ? 'Presente' : a.estado === 'ausente' ? 'Ausente' : 'Justificado',
      'Registrado Por': a.registrado_por_nombre
    }))

    // Agregar resumen
    datosExcel.push({})
    datosExcel.push({ 'Fecha': 'RESUMEN' })
    datosExcel.push({ 'Fecha': 'Total Registros', 'Niño': datosAsistencia.resumen.total_registros })
    datosExcel.push({ 'Fecha': 'Presentes', 'Niño': datosAsistencia.resumen.presentes })
    datosExcel.push({ 'Fecha': 'Ausentes', 'Niño': datosAsistencia.resumen.ausentes })
    datosExcel.push({ 'Fecha': 'Justificados', 'Niño': datosAsistencia.resumen.justificados })
    datosExcel.push({ 'Fecha': '% Asistencia', 'Niño': `${datosAsistencia.resumen.porcentaje_asistencia}%` })

    const ws = XLSX.utils.json_to_sheet(datosExcel)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte Asistencia')

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `Reporte_Asistencia_${mes}_${anio}.xlsx`)
  }

  // ==================== REPORTE NIÑOS ====================
  async function generarReporteNinos() {
    try {
      setLoadingNinos(true)

      const res = await fetch(`${API_URL}/reportes/ninos`, { credentials: 'include' })

      if (res.ok) {
        const data = await res.json()
        setDatosNinos(data)
      } else {
        const error = await res.json()
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error,
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al generar reporte',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoadingNinos(false)
    }
  }

  function descargarExcelNinos() {
    if (!datosNinos) return

    // Hoja 1: Lista de niños
    const ninosExcel = datosNinos.ninos.map((n: any) => ({
      'Nombres': n.nombres,
      'Apellidos': n.apellidos,
      'Fecha Nacimiento': new Date(n.fecha_nacimiento).toLocaleDateString('es-GT'),
      'Edad': n.edad,
      'Género': n.genero === 'M' ? 'Masculino' : 'Femenino',
      'Nivel': n.nivel_nombre || 'Sin nivel',
      'Subnivel': n.subnivel_nombre || 'Sin subnivel',
      'Encargado': n.nombre_encargado,
      'Teléfono': n.telefono_contacto,
      'Dirección': n.direccion,
      'Estado': n.activo ? 'Activo' : 'Inactivo'
    }))

    const ws1 = XLSX.utils.json_to_sheet(ninosExcel)

    // Hoja 2: Resumen estadístico
    const resumenExcel: any[] = []
    
    resumenExcel.push({ 'Concepto': 'RESUMEN GENERAL' })
    resumenExcel.push({ 'Concepto': 'Total Niños Activos', 'Valor': datosNinos.resumen.total_ninos })
    resumenExcel.push({ 'Concepto': 'Total Niños Inactivos', 'Valor': datosNinos.resumen.ninos_inactivos })
    resumenExcel.push({})
    
    resumenExcel.push({ 'Concepto': 'POR NIVEL' })
    datosNinos.resumen.por_nivel.forEach((n: any) => {
      resumenExcel.push({ 'Concepto': n.nivel || 'Sin nivel', 'Valor': n.cantidad })
    })
    resumenExcel.push({})
    
    resumenExcel.push({ 'Concepto': 'POR GÉNERO' })
    datosNinos.resumen.por_genero.forEach((g: any) => {
      resumenExcel.push({ 'Concepto': g.genero === 'M' ? 'Masculino' : 'Femenino', 'Valor': g.cantidad })
    })
    resumenExcel.push({})
    
    resumenExcel.push({ 'Concepto': 'POR EDAD' })
    datosNinos.resumen.por_edad.forEach((e: any) => {
      resumenExcel.push({ 'Concepto': e.rango_edad, 'Valor': e.cantidad })
    })

    const ws2 = XLSX.utils.json_to_sheet(resumenExcel)

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, 'Lista de Niños')
    XLSX.utils.book_append_sheet(wb, ws2, 'Estadísticas')

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    saveAs(blob, `Reporte_Ninos_${new Date().toISOString().split('T')[0]}.xlsx`)
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
              Generación y descarga de reportes en Excel
            </p>
          </div>
        </div>

        {/* Tabs de reportes */}
        <div style={{ borderBottom: '1px solid var(--border)', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              className={`tab ${reporteActivo === 'financiero' ? 'active' : ''}`}
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
              className={`tab ${reporteActivo === 'asistencia' ? 'active' : ''}`}
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
              className={`tab ${reporteActivo === 'ninos' ? 'active' : ''}`}
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
              👶 Estadísticas Niños
            </button>
          </div>
        </div>

        <div className="card-content">
          {/* REPORTE FINANCIERO */}
          {reporteActivo === 'financiero' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>💰 Reporte Financiero</h2>
              
              <div className="form" style={{ maxWidth: '600px', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Fecha Inicio</label>
                    <input
                      type="date"
                      className="input"
                      value={fechaInicio}
                      onChange={e => setFechaInicio(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Fecha Fin</label>
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
                 onClick={generarReporteFinanciero}
                 disabled={loadingFinanciero}
                  style={{ marginTop: '1rem' }}
                    >
                {loadingFinanciero ? 'Generando...' : 'Generar Reporte'}
                </button>
              </div>

              {datosFinancieros && (
                <div>
                  {/* Resumen */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '1.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Facturas</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{datosFinancieros.resumen.total_facturas}</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ingresos</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>Q {datosFinancieros.resumen.ingresos}</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Egresos</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ef4444' }}>Q {datosFinancieros.resumen.egresos}</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Balance</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: parseFloat(datosFinancieros.resumen.balance) >= 0 ? '#10b981' : '#ef4444' }}>
                        Q {datosFinancieros.resumen.balance}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '500' }}>Detalle de Facturas</h3>
                    <button className="btn" onClick={descargarExcelFinanciero}>
                      📥 Descargar Excel
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-elevated)', borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>No. Factura</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Descripción</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Tipo</th>
                          <th style={{ padding: '0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '500' }}>Monto</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Fecha Subida</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Creado Por</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosFinancieros.facturas.map((f: any) => (
                          <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{f.numero_factura}</td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{f.descripcion}</td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                background: f.tipo === 'ingreso' ? '#dcfce7' : '#fee2e2',
                                color: f.tipo === 'ingreso' ? '#166534' : '#991b1b'
                              }}>
                                {f.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'right', fontWeight: '500' }}>
                              Q {parseFloat(f.monto).toFixed(2)}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                              {new Date(f.creado_en).toLocaleDateString('es-GT')}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{f.creado_por_nombre}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REPORTE ASISTENCIA */}
          {reporteActivo === 'asistencia' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>📅 Reporte de Asistencia</h2>
              
              <div className="form" style={{ maxWidth: '600px', marginBottom: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="label">Mes</label>
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
                    <label className="label">Año</label>
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
                  onClick={generarReporteAsistencia}
                  disabled={loadingAsistencia}
                  style={{ marginTop: '1rem' }}
                >
                  {loadingAsistencia ? 'Generando...' : 'Generar Reporte'}
                </button>
              </div>

              {datosAsistencia && (
                <div>
                  {/* Resumen */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '1.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Registros</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>{datosAsistencia.resumen.total_registros}</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Presentes</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>{datosAsistencia.resumen.presentes}</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ausentes</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ef4444' }}>{datosAsistencia.resumen.ausentes}</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Justificados</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#f59e0b' }}>{datosAsistencia.resumen.justificados}</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>% Asistencia</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#3b82f6' }}>{datosAsistencia.resumen.porcentaje_asistencia}%</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '500' }}>Detalle de Asistencia</h3>
                    <button className="btn" onClick={descargarExcelAsistencia}>
                      📥 Descargar Excel
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-elevated)', borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Fecha</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Niño</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Nivel</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Estado</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Registrado Por</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosAsistencia.asistencias.slice(0, 50).map((a: any) => (
                          <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                              {new Date(a.fecha).toLocaleDateString('es-GT')}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{a.nino_nombre}</td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                              {a.nivel_nombre || 'Sin nivel'} {a.subnivel_nombre ? `- ${a.subnivel_nombre}` : ''}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                background: a.estado === 'presente' ? '#dcfce7' : a.estado === 'ausente' ? '#fee2e2' : '#fef3c7',
                                color: a.estado === 'presente' ? '#166534' : a.estado === 'ausente' ? '#991b1b' : '#92400e'
                              }}>
                                {a.estado === 'presente' ? 'Presente' : a.estado === 'ausente' ? 'Ausente' : 'Justificado'}
                              </span>
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{a.registrado_por_nombre}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {datosAsistencia.asistencias.length > 50 && (
                    <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      Mostrando 50 de {datosAsistencia.asistencias.length} registros. Descarga el Excel para ver todos.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* REPORTE NIÑOS */}
          {reporteActivo === 'ninos' && (
            <div>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>👶 Estadísticas de Niños</h2>
              
              <button
                className="btn"
                onClick={generarReporteNinos}
                disabled={loadingNinos}
                style={{ marginBottom: '2rem' }}
              >
                {loadingNinos ? 'Generando...' : 'Generar Reporte'}
              </button>

              {datosNinos && (
                <div>
                  {/* Resumen General */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ padding: '1.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Niños Activos</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>{datosNinos.resumen.total_ninos}</div>
                    </div>
                    <div style={{ padding: '1.5rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Niños Inactivos</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ef4444' }}>{datosNinos.resumen.ninos_inactivos}</div>
                    </div>
                  </div>

                  {/* Estadísticas por Nivel */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '1rem' }}>Por Nivel</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      {datosNinos.resumen.por_nivel.map((n: any, idx: number) => (
                        <div key={idx} style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            {n.nivel || 'Sin nivel'}
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{n.cantidad}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Estadísticas por Género */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '1rem' }}>Por Género</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      {datosNinos.resumen.por_genero.map((g: any, idx: number) => (
                        <div key={idx} style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            {g.genero === 'M' ? '👦 Masculino' : '👧 Femenino'}
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{g.cantidad}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Estadísticas por Edad */}
                  <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '500', marginBottom: '1rem' }}>Por Rango de Edad</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      {datosNinos.resumen.por_edad.map((e: any, idx: number) => (
                        <div key={idx} style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                            {e.rango_edad}
                          </div>
                          <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{e.cantidad}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: '500' }}>Lista Completa de Niños</h3>
                    <button className="btn" onClick={descargarExcelNinos}>
                      📥 Descargar Excel Completo
                    </button>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-elevated)', borderBottom: '2px solid var(--border)' }}>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Nombres</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Apellidos</th>
                          <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '500' }}>Edad</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Género</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Nivel</th>
                          <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '500' }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {datosNinos.ninos.slice(0, 30).map((n: any) => (
                          <tr key={n.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{n.nombres}</td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{n.apellidos}</td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem', textAlign: 'center' }}>{n.edad}</td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                              {n.genero === 'M' ? '👦 M' : '👧 F'}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                              {n.nivel_nombre || 'Sin nivel'}
                              {n.subnivel_nombre && ` - ${n.subnivel_nombre}`}
                            </td>
                            <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                              <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: '500',
                                background: n.activo ? '#dcfce7' : '#fee2e2',
                                color: n.activo ? '#166534' : '#991b1b'
                              }}>
                                {n.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {datosNinos.ninos.length > 30 && (
                    <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      Mostrando 30 de {datosNinos.ninos.length} niños. Descarga el Excel para ver todos.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}