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
  activo: boolean
}

export default function GestionNinos() {
  const [ninos, setNinos] = useState<Nino[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'activos' | 'inactivos'>('todos')
  const [showInactivarModal, setShowInactivarModal] = useState(false)
  const [ninoSeleccionado, setNinoSeleccionado] = useState<Nino | null>(null)
  const [motivoInactividad, setMotivoInactividad] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    cargarNinos()
  }, [])

  async function cargarNinos() {
    try {
      setLoading(true)
      console.log('📋 Cargando niños...')
      
      const res = await fetch(`${API_URL}/ninos`, { credentials: 'include' })
      
      if (!res.ok) {
        throw new Error('Error al cargar niños')
      }
      
      const data = await res.json()
      console.log('   Total:', data.length)
      console.log('   Activos:', data.filter((n: any) => n.activo !== false).length)
      console.log('   Inactivos:', data.filter((n: any) => n.activo === false).length)
      
      setNinos(data)
    } catch (error: any) {
      console.error('❌ Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar niños',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setLoading(false)
    }
  }

  function abrirModalInactivar(nino: Nino) {
    setNinoSeleccionado(nino)
    setMotivoInactividad('')
    setShowInactivarModal(true)
  }

  async function inactivarNino() {
    if (!ninoSeleccionado) return

    if (!motivoInactividad.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Motivo requerido',
        text: 'Debes especificar el motivo de inactividad',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Inactivar niño?',
      html: `
        <p>¿Estás seguro de inactivar a:</p>
        <p style="font-size: 1.125rem; font-weight: 600; margin: 1rem 0;">
          ${ninoSeleccionado.nombres} ${ninoSeleccionado.apellidos}
        </p>
      `,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, inactivar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      setProcesando(true)
      console.log('🚪 Inactivando con POST:', ninoSeleccionado.id)

      // NUEVA URL: /ninos/inactivar/:id
      const res = await fetch(`${API_URL}/ninos/inactivar/${ninoSeleccionado.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoInactividad.trim() })
      })

      console.log('   Status:', res.status)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al inactivar')
      }

      await Swal.fire({
        icon: 'success',
        title: '¡Inactivado!',
        text: `${ninoSeleccionado.nombres} ${ninoSeleccionado.apellidos} fue inactivado`,
        timer: 2000,
        showConfirmButton: false
      })
      
      setShowInactivarModal(false)
      setNinoSeleccionado(null)
      setMotivoInactividad('')
      cargarNinos()

    } catch (error: any) {
      console.error('❌ Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setProcesando(false)
    }
  }

  async function reactivarNino(nino: Nino) {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Reactivar niño?',
      html: `
        <p>¿Estás seguro de reactivar a:</p>
        <p style="font-size: 1.125rem; font-weight: 600; margin: 1rem 0;">
          ${nino.nombres} ${nino.apellidos}
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
      console.log('✅ Reactivando con POST:', nino.id)
      
      // NUEVA URL: /ninos/reactivar/:id
      const res = await fetch(`${API_URL}/ninos/reactivar/${nino.id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      })

      console.log('   Status:', res.status)

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al reactivar')
      }

      await Swal.fire({
        icon: 'success',
        title: '¡Reactivado!',
        text: `${nino.nombres} ${nino.apellidos} fue reactivado`,
        timer: 2000,
        showConfirmButton: false
      })
      
      cargarNinos()

    } catch (error: any) {
      console.error('❌ Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message,
        confirmButtonColor: '#3b82f6'
      })
    }
  }

  function verDetalles(nino: Nino) {
    const infoHTML = `
      <div style="text-align: left; padding: 1rem;">
        <p style="margin: 0.5rem 0;"><strong>👤 Nombre:</strong> ${nino.nombres} ${nino.apellidos}</p>
        <p style="margin: 0.5rem 0;"><strong>🎂 Fecha Nac:</strong> ${formatearFecha(nino.fecha_nacimiento)}</p>
        <p style="margin: 0.5rem 0;"><strong>📅 Edad:</strong> ${nino.edad} años</p>
        ${nino.codigo ? `<p style="margin: 0.5rem 0;"><strong>🔢 Código:</strong> ${nino.codigo}</p>` : ''}
        ${nino.nivel_nombre ? `<p style="margin: 0.5rem 0;"><strong>📚 Nivel:</strong> ${nino.nivel_nombre}</p>` : ''}
        ${nino.activo === false && nino.motivo_inactividad ? `
          <hr style="margin: 1rem 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0.5rem 0; color: #ef4444;"><strong>Estado:</strong> Inactivo</p>
          <p style="margin: 0.5rem 0;"><strong>Motivo:</strong> ${nino.motivo_inactividad}</p>
        ` : ''}
      </div>
    `
    
    Swal.fire({
      title: 'Información',
      html: infoHTML,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#3b82f6',
      width: '500px'
    })
  }

  function formatearFecha(fecha: string): string {
    const [año, mes, dia] = fecha.split('T')[0].split('-')
    return `${dia}/${mes}/${año}`
  }

  const ninosFiltrados = ninos.filter(nino => {
    if (filtro === 'activos' && nino.activo === false) return false
    if (filtro === 'inactivos' && nino.activo !== false) return false

    if (!busqueda.trim()) return true
    const s = busqueda.toLowerCase()
    return (
      nino.nombres.toLowerCase().includes(s) ||
      nino.apellidos.toLowerCase().includes(s) ||
      (nino.codigo && nino.codigo.toLowerCase().includes(s))
    )
  })

  const totalActivos = ninos.filter(n => n.activo !== false).length
  const totalInactivos = ninos.filter(n => n.activo === false).length
  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">📋 Gestión de Niños</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Ver y gestionar niños activos e inactivos
            </p>
          </div>
        </div>

        <div className="toolbar" style={{ flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '2px solid #10b981' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#10b981' }}>{totalActivos}</span>
              <span style={{ marginLeft: '0.5rem' }}>Activos</span>
            </div>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '2px solid #ef4444' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ef4444' }}>{totalInactivos}</span>
              <span style={{ marginLeft: '0.5rem' }}>Inactivos</span>
            </div>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '2px solid var(--primary)' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--primary)' }}>{ninos.length}</span>
              <span style={{ marginLeft: '0.5rem' }}>Total</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button className={filtro === 'todos' ? 'btn' : 'btn btn-ghost'} onClick={() => setFiltro('todos')}>
              Todos ({ninos.length})
            </button>
            <button className={filtro === 'activos' ? 'btn' : 'btn btn-ghost'} onClick={() => setFiltro('activos')} style={filtro === 'activos' ? { background: '#10b981' } : {}}>
              ✅ Activos ({totalActivos})
            </button>
            <button className={filtro === 'inactivos' ? 'btn' : 'btn btn-ghost'} onClick={() => setFiltro('inactivos')} style={filtro === 'inactivos' ? { background: '#ef4444' } : {}}>
              🚪 Inactivos ({totalInactivos})
            </button>
            <input
              type="text"
              className="input"
              placeholder="🔍 Buscar..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ flex: 1, maxWidth: '300px' }}
            />
          </div>
        </div>

        <div className="card-content">
          {loading ? (
            <div className="loading">Cargando...</div>
          ) : ninosFiltrados.length === 0 ? (
            <div className="alert" style={{ textAlign: 'center', padding: '2rem' }}>
              <p>No se encontraron niños</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {ninosFiltrados.map(nino => (
                <div key={nino.id} style={{ padding: '1rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: nino.activo === false ? '2px solid #fee2e2' : '2px solid #d1fae5', position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: nino.activo === false ? '#fee2e2' : '#d1fae5', color: nino.activo === false ? '#991b1b' : '#065f46', padding: '0.25rem 0.5rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600' }}>
                    {nino.activo === false ? '🚪 INACTIVO' : '✅ ACTIVO'}
                  </div>
                  <h3 style={{ marginBottom: '0.5rem', paddingRight: '5rem' }}>{nino.nombres} {nino.apellidos}</h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                    <div>📅 {nino.edad} años</div>
                    {nino.codigo && <div>🔢 {nino.codigo}</div>}
                    {nino.activo === false && nino.motivo_inactividad && (
                      <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#fee2e2', borderRadius: '4px', fontSize: '0.8rem', color: '#991b1b' }}>
                        <strong>Motivo:</strong> {nino.motivo_inactividad}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-ghost" onClick={() => verDetalles(nino)} style={{ flex: 1 }}>👁️</button>
                    {nino.activo !== false ? (
                      <button className="btn" onClick={() => abrirModalInactivar(nino)} style={{ flex: 1, background: '#ef4444', color: 'white' }}>🚪</button>
                    ) : (
                      <button className="btn" onClick={() => reactivarNino(nino)} style={{ flex: 1, background: '#10b981', color: 'white' }}>✅</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showInactivarModal && ninoSeleccionado && (
        <div className="modal-backdrop" onClick={() => !procesando && setShowInactivarModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>🚪 Inactivar Niño</h2>
              <button className="btn btn-ghost" onClick={() => setShowInactivarModal(false)} disabled={procesando}>✕</button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <div className="alert" style={{ marginBottom: '1rem', background: '#fef3c7', border: '2px solid #f59e0b', color: '#92400e', padding: '1rem' }}>
                <p style={{ fontWeight: '600' }}>Vas a inactivar a:</p>
                <p style={{ fontSize: '1.125rem', fontWeight: '700', margin: '0.5rem 0' }}>
                  {ninoSeleccionado.nombres} {ninoSeleccionado.apellidos}
                </p>
              </div>
              <label className="label">Motivo de inactividad *</label>
              <textarea
                className="textarea"
                value={motivoInactividad}
                onChange={e => setMotivoInactividad(e.target.value)}
                placeholder="Ej: Cumplió 18 años, Se mudó..."
                rows={3}
                disabled={procesando}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setShowInactivarModal(false)} disabled={procesando}>Cancelar</button>
              <button className="btn" onClick={inactivarNino} disabled={procesando || !motivoInactividad.trim()} style={{ background: '#ef4444' }}>
                {procesando ? 'Procesando...' : '🚪 Inactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}