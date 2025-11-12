
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
}

export default function NinosInactivos() {
  const [ninos, setNinos] = useState<Nino[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    cargarNinosInactivos()
  }, [])

  async function cargarNinosInactivos() {
    try {
      setLoading(true)
      console.log('🚪 Cargando niños inactivos...')
      
      const res = await fetch(`${API_URL}/ninos`, { credentials: 'include' })
      
      if (!res.ok) {
        throw new Error('Error al cargar niños')
      }
      
      const data = await res.json()
      console.log('   Total niños en BD:', data.length)
      
      // Filtrar solo inactivos
      const inactivos = data.filter((n: any) => n.activo === false)
      console.log('   Niños inactivos:', inactivos.length)
      
      if (inactivos.length > 0) {
        console.log('   Primer niño inactivo:', inactivos[0])
      }
      
      setNinos(inactivos)
    } catch (error: any) {
      console.error('❌ Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al cargar niños inactivos',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoading(false)
    }
  }

  async function reactivarNino(id: string, nombre: string) {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Reactivar niño?',
      html: `
        <p>¿Estás seguro de reactivar a:</p>
        <p style="font-size: 1.125rem; font-weight: 600; margin: 1rem 0;">
          ${nombre}
        </p>
        <p style="color: #10b981; margin-top: 1rem; font-weight: 500;">
          ✅ El niño volverá a la lista de activos
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
      console.log('✅ Reactivando niño:', id)
      
      const res = await fetch(`${API_URL}/ninos/${id}/reactivar`, {
        method: 'POST',
        credentials: 'include'
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Error al reactivar')
      }

      await Swal.fire({
        icon: 'success',
        title: '¡Reactivado!',
        text: `${nombre} ha sido reactivado`,
        timer: 2000,
        showConfirmButton: false
      })
      
      cargarNinosInactivos()
    } catch (error: any) {
      console.error('❌ Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al reactivar niño',
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
        <hr style="margin: 1rem 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0.5rem 0; color: #ef4444;"><strong>🚪 Motivo de Inactividad:</strong></p>
        <p style="margin: 0.5rem 0; padding: 0.5rem; background: #fee2e2; border-radius: 4px;">
          ${nino.motivo_inactividad || 'No especificado'}
        </p>
        ${nino.fecha_inactivacion ? `<p style="margin: 0.5rem 0;"><strong>📅 Fecha de Inactivación:</strong> ${formatearFecha(nino.fecha_inactivacion)}</p>` : ''}
      </div>
    `
    
    Swal.fire({
      title: 'Detalles del Niño Inactivo',
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

  // Filtrar por búsqueda
  const ninosFiltrados = ninos.filter(nino => {
    if (!busqueda.trim()) return true
    const searchTerm = busqueda.toLowerCase()
    return (
      nino.nombres.toLowerCase().includes(searchTerm) ||
      nino.apellidos.toLowerCase().includes(searchTerm) ||
      (nino.codigo && nino.codigo.toLowerCase().includes(searchTerm)) ||
      (nino.motivo_inactividad && nino.motivo_inactividad.toLowerCase().includes(searchTerm))
    )
  })

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">🚪 Niños Inactivos</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Listado de niños que ya no están activos en el sistema
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div className="toolbar">
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
              🔍
            </span>
            <input
              type="text"
              className="input"
              placeholder="Buscar por nombre, código o motivo..."
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

        <div className="card-content">
          {loading ? (
            <div className="loading">Cargando...</div>
          ) : ninosFiltrados.length === 0 ? (
            <div className="alert" style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
              <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                {busqueda ? `No se encontraron resultados para "${busqueda}"` : 'No hay niños inactivos'}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                {!busqueda && 'Todos los niños están activos en el sistema'}
              </p>
            </div>
          ) : (
            <>
              {/* Contador */}
              <div style={{ 
                padding: '1rem', 
                background: 'var(--surface-elevated)', 
                borderRadius: 'var(--radius)', 
                marginBottom: '1.5rem',
                border: '1px solid var(--border)'
              }}>
                <p style={{ fontSize: '1rem', fontWeight: '500' }}>
                  📊 Total de niños inactivos: <strong>{ninosFiltrados.length}</strong>
                </p>
              </div>

              {/* Grid de niños */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {ninosFiltrados.map(nino => (
                  <div 
                    key={nino.id} 
                    style={{ 
                      padding: '1.25rem', 
                      background: 'var(--surface-elevated)', 
                      borderRadius: 'var(--radius)', 
                      border: '2px solid #fee2e2',
                      position: 'relative'
                    }}
                  >
                    {/* Badge de inactivo */}
                    <div style={{
                      position: 'absolute',
                      top: '0.75rem',
                      right: '0.75rem',
                      background: '#fee2e2',
                      color: '#991b1b',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      INACTIVO
                    </div>

                    <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: '500', paddingRight: '5rem' }}>
                      {nino.nombres} {nino.apellidos}
                    </h3>

                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.6' }}>
                      <div>🎂 Fecha Nac: {formatearFecha(nino.fecha_nacimiento)}</div>
                      <div>📅 Edad: {calcularEdad(nino.fecha_nacimiento)} años</div>
                      {nino.codigo && <div>🔢 Código: {nino.codigo}</div>}
                      {nino.nivel_nombre && <div>📚 Nivel: {nino.nivel_nombre}</div>}
                      {nino.fecha_inactivacion && (
                        <div style={{ marginTop: '0.5rem', color: '#ef4444' }}>
                          🚪 Inactivo desde: {formatearFecha(nino.fecha_inactivacion)}
                        </div>
                      )}
                      {nino.motivo_inactividad && (
                        <div style={{ 
                          marginTop: '0.75rem', 
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
                        👁️ Ver Detalles
                      </button>
                      <button 
                        className="btn"
                        onClick={() => reactivarNino(nino.id, `${nino.nombres} ${nino.apellidos}`)}
                        style={{ 
                          flex: '1 1 auto',
                          background: '#10b981',
                          color: 'white'
                        }}
                      >
                        ✅ Reactivar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
