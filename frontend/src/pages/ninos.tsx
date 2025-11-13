import { useState, useEffect } from 'react'
import { API_URL } from '../config'
import Swal from 'sweetalert2'

interface Maestro {
  id: string
  nombres: string
  apellidos: string
}

interface Nivel {
  id: string
  nombre: string
}

interface Nino {
  id: string
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  nivel_id: string | null
  maestro_id: string
  codigo: string | null
  nombre_encargado: string | null
  telefono_encargado: string | null
  direccion_encargado: string | null
  maestro_nombre: string
  maestro_email: string
  nivel_nombre: string | null
  edad: number
  activo: boolean
}

export default function Ninos() {
  const [ninos, setNinos] = useState<Nino[]>([])
  const [maestros, setMaestros] = useState<Maestro[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Estados para inactivar
  const [showInactivarModal, setShowInactivarModal] = useState(false)
  const [ninoAInactivar, setNinoAInactivar] = useState<Nino | null>(null)
  const [motivoInactividad, setMotivoInactividad] = useState('')
  const [inactivando, setInactivando] = useState(false)

  // Búsqueda
  const [busqueda, setBusqueda] = useState('')

  // Form state
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [nivelId, setNivelId] = useState('')
  const [maestroId, setMaestroId] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nombreEncargado, setNombreEncargado] = useState('')
  const [telefonoEncargado, setTelefonoEncargado] = useState('')
  const [direccionEncargado, setDireccionEncargado] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [busqueda])

  async function cargarDatos() {
    try {
      setLoading(true)

      const [maestrosRes, nivRes] = await Promise.all([
        fetch(`${API_URL}/usuarios`, { credentials: 'include' }),
        fetch(`${API_URL}/niveles`, { credentials: 'include' })
      ])

      if (maestrosRes.ok) setMaestros(await maestrosRes.json())
      if (nivRes.ok) setNiveles(await nivRes.json())

      const params = new URLSearchParams()
      if (busqueda.trim()) params.append('buscar', busqueda.trim())

      const ninosUrl = `${API_URL}/ninos?${params.toString()}`
      console.log('📡 Cargando niños desde:', ninosUrl)
      
      const ninosRes = await fetch(ninosUrl, { credentials: 'include' })
      
      if (ninosRes.ok) {
        const data = await ninosRes.json()
        console.log('✅ Niños recibidos:', data.length)
        console.log('   - Activos:', data.filter((n: any) => n.activo !== false).length)
        console.log('   - Inactivos:', data.filter((n: any) => n.activo === false).length)
        
        // Filtrar solo niños activos
        const ninosActivos = data.filter((n: any) => n.activo !== false)
        setNinos(ninosActivos)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  function abrirModal(nino?: Nino) {
    if (nino) {
      setEditingId(nino.id)
      setNombres(nino.nombres)
      setApellidos(nino.apellidos)
      const fechaSolo = nino.fecha_nacimiento.split('T')[0]
      setFechaNacimiento(fechaSolo)
      setNivelId(nino.nivel_id || '')
      setMaestroId(nino.maestro_id)
      setCodigo(nino.codigo || '')
      setNombreEncargado(nino.nombre_encargado || '')
      setTelefonoEncargado(nino.telefono_encargado || '')
      setDireccionEncargado(nino.direccion_encargado || '')
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  function resetForm() {
    setEditingId(null)
    setNombres('')
    setApellidos('')
    setFechaNacimiento('')
    setNivelId('')
    setMaestroId('')
    setCodigo('')
    setNombreEncargado('')
    setTelefonoEncargado('')
    setDireccionEncargado('')
  }

  function verInfo(nino: Nino) {
    const edad = calcularEdad(nino.fecha_nacimiento)
    const infoHTML = `
      <div style="text-align: left; padding: 1rem;">
        <p style="margin: 0.5rem 0;"><strong>👤 Nombre:</strong> ${nino.nombres} ${nino.apellidos}</p>
        <p style="margin: 0.5rem 0;"><strong>🎂 Fecha de Nacimiento:</strong> ${formatearFecha(nino.fecha_nacimiento)}</p>
        <p style="margin: 0.5rem 0;"><strong>📅 Edad:</strong> ${edad} años</p>
        ${nino.codigo ? `<p style="margin: 0.5rem 0;"><strong>🔢 Código:</strong> ${nino.codigo}</p>` : ''}
        <p style="margin: 0.5rem 0;"><strong>👨‍🏫 Maestro/a:</strong> ${nino.maestro_nombre || nino.maestro_email || 'Sin asignar'}</p>
        ${nino.nivel_nombre ? `<p style="margin: 0.5rem 0;"><strong>📚 Nivel:</strong> ${nino.nivel_nombre}</p>` : ''}
        ${nino.nombre_encargado ? `<p style="margin: 0.5rem 0;"><strong>👤 Encargado:</strong> ${nino.nombre_encargado}</p>` : ''}
        ${nino.telefono_encargado ? `<p style="margin: 0.5rem 0;"><strong>📱 Teléfono:</strong> ${nino.telefono_encargado}</p>` : ''}
        ${nino.direccion_encargado ? `<p style="margin: 0.5rem 0;"><strong>🏠 Dirección:</strong> ${nino.direccion_encargado}</p>` : ''}
      </div>
    `
    
    Swal.fire({
      title: 'Información del Niño',
      html: infoHTML,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#3b82f6',
      width: '500px'
    })
  }

  async function handleSubmit(e: React.FormEvent) {
  e.preventDefault()

  // VALIDACIONES
  if (!nombres.trim() || !apellidos.trim() || !fechaNacimiento || !maestroId || !codigo.trim()) {
    Swal.fire({
      icon: 'warning',
      title: 'Campos incompletos',
      text: 'Completa nombres, apellidos, fecha de nacimiento, código y maestro',
      confirmButtonColor: '#3b82f6'
    })
    return
  }

  // Validar teléfono del encargado
  if (telefonoEncargado.trim()) {
    const telefonoLimpio = telefonoEncargado.replace(/\s/g, '')
    
    // Solo números
    if (!/^\d+$/.test(telefonoLimpio)) {
      Swal.fire({
        icon: 'warning',
        title: 'Teléfono inválido',
        text: 'El teléfono del encargado solo debe contener números',
        confirmButtonColor: '#3b82f6'
      })
      return
    }
    
    // Exactamente 8 dígitos
    if (telefonoLimpio.length !== 8) {
      Swal.fire({
        icon: 'warning',
        title: 'Teléfono inválido',
        text: 'El teléfono del encargado debe tener exactamente 8 dígitos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }
  }

  try {
    setSaving(true)

    const data = {
      nombres: nombres.trim(),
      apellidos: apellidos.trim(),
      fecha_nacimiento: fechaNacimiento,
      nivel_id: nivelId || null,
      subnivel_id: null,
      maestro_id: maestroId,
      codigo: codigo.trim(),
      nombre_encargado: nombreEncargado.trim() || null,
      telefono_encargado: telefonoEncargado.replace(/\s/g, '') || null,
      direccion_encargado: direccionEncargado.trim() || null
    }

    const url = editingId ? `${API_URL}/ninos/${editingId}` : `${API_URL}/ninos`
    const res = await fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      await Swal.fire({
        icon: 'success',
        title: editingId ? '¡Actualizado!' : '¡Registrado!',
        timer: 2000,
        showConfirmButton: false
      })
      setShowModal(false)
      resetForm()
      cargarDatos()
    } else {
      const err = await res.json()
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.error,
        confirmButtonColor: '#3b82f6'
      })
    }
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error al guardar',
      confirmButtonColor: '#3b82f6'
    })
  } finally {
    setSaving(false)
  }
}

  async function handleEliminar(id: string, nombre: string) {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar?',
      text: `¿Eliminar a ${nombre}?`,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`${API_URL}/ninos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: '¡Eliminado!',
          timer: 2000,
          showConfirmButton: false
        })
        cargarDatos()
      } else {
        const err = await res.json()
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error,
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al eliminar',
        confirmButtonColor: '#3b82f6'
      })
    }
  }

  // ==================== FUNCIONES PARA INACTIVAR ====================

  function abrirModalInactivar(nino: Nino) {
    console.log('🚪 Abriendo modal para inactivar:', nino)
    setNinoAInactivar(nino)
    setMotivoInactividad('')
    setShowInactivarModal(true)
  }

  async function inactivarNino() {
    if (!ninoAInactivar) return

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
          ${ninoAInactivar.nombres} ${ninoAInactivar.apellidos}
        </p>
        <p style="color: #ef4444; margin-top: 1rem; font-weight: 500;">
          ⚠️ El niño será movido a la lista de inactivos
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
      setInactivando(true)

      console.log('🚪 Inactivando niño...')
      console.log('   ID:', ninoAInactivar.id)
      console.log('   Motivo:', motivoInactividad)
      console.log('   URL:', `${API_URL}/ninos/${ninoAInactivar.id}/inactivar`)

      const res = await fetch(`${API_URL}/ninos/${ninoAInactivar.id}/inactivar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          motivo: motivoInactividad.trim()
        })
      })

      console.log('📡 Response status:', res.status)
      console.log('📡 Response ok:', res.ok)

      if (!res.ok) {
        const errorText = await res.text()
        console.error('❌ Error response text:', errorText)
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: 'Error al procesar respuesta del servidor' }
        }
        
        throw new Error(errorData.error || 'Error al inactivar niño')
      }

      const data = await res.json()
      console.log('✅ Response data:', data)

      await Swal.fire({
        icon: 'success',
        title: '¡Niño inactivado!',
        text: `${ninoAInactivar.nombres} ${ninoAInactivar.apellidos} fue movido a inactivos`,
        timer: 3000,
        showConfirmButton: false
      })
      
      setShowInactivarModal(false)
      setNinoAInactivar(null)
      setMotivoInactividad('')
      
      console.log('🔄 Recargando lista de niños...')
      await cargarDatos()

    } catch (error: any) {
      console.error('❌ Error completo:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Error al inactivar niño',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setInactivando(false)
    }
  }

  // ==================== FUNCIONES AUXILIARES ====================

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

  function formatearFecha(fecha: string): string {
    const fechaSolo = fecha.split('T')[0]
    const [año, mes, dia] = fechaSolo.split('-')
    return `${dia}/${mes}/${año}`
  }

  function esCumpleañeroDelMes(fechaNac: string): boolean {
    const hoy = new Date()
    const fechaSolo = fechaNac.split('T')[0]
    const [año, mes, dia] = fechaSolo.split('-').map(Number)
    const nac = new Date(año, mes - 1, dia)
    return nac.getMonth() === hoy.getMonth()
  }

  const cumpleañerosDelMes = ninos
    .filter(nino => esCumpleañeroDelMes(nino.fecha_nacimiento))
    .sort((a, b) => {
      const fechaA = a.fecha_nacimiento.split('T')[0]
      const fechaB = b.fecha_nacimiento.split('T')[0]
      const diaA = new Date(fechaA).getDate()
      const diaB = new Date(fechaB).getDate()
      return diaA - diaB
    })

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Listado Oficial de Niños</h1>
          <button className="btn" onClick={() => abrirModal()}>
            Registrar Niño
          </button>
        </div>

        <div className="toolbar">
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>
              🔍
            </span>
            <input
              type="text"
              className="input"
              placeholder="Buscar por código, nombre o apellido..."
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
          ) : ninos.length === 0 ? (
            <div className="alert" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                {busqueda ? `No se encontraron resultados para "${busqueda}"` : 'No se encontraron niños'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {ninos.map(nino => (
                <div key={nino.id} style={{ padding: '1.25rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem', fontWeight: '500' }}>
                    {nino.nombres} {nino.apellidos}
                  </h3>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.6' }}>
                    <div>🎂 Fecha Nac: {formatearFecha(nino.fecha_nacimiento)}</div>
                    <div>📅 Edad: {calcularEdad(nino.fecha_nacimiento)} años</div>
                    {esCumpleañeroDelMes(nino.fecha_nacimiento) && (
                      <div style={{ color: '#f59e0b', fontWeight: '500', marginTop: '0.25rem' }}>
                        🎉 ¡Cumpleaños este mes!
                      </div>
                    )}
                    {nino.codigo && <div>🔢 Código: {nino.codigo}</div>}
                    <div style={{ fontWeight: '500', color: 'var(--text-primary)', marginTop: '0.5rem' }}>
                      👨‍🏫 Maestro/a: {nino.maestro_nombre || nino.maestro_email || 'Sin asignar'}
                    </div>
                    {nino.nivel_nombre && <div>📚 Nivel: {nino.nivel_nombre}</div>}
                    {nino.nombre_encargado && <div>👤 Encargado: {nino.nombre_encargado}</div>}
                    {nino.telefono_encargado && <div>📱 Tel: {nino.telefono_encargado}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-ghost" onClick={() => verInfo(nino)} style={{ flex: '1 1 auto' }}>
                      Ver Info
                    </button>
                    <button className="btn btn-ghost" onClick={() => abrirModal(nino)} style={{ flex: '1 1 auto' }}>
                      Editar
                    </button>
                    <button className="btn btn-danger" onClick={() => handleEliminar(nino.id, `${nino.nombres} ${nino.apellidos}`)} style={{ flex: '1 1 auto' }}>
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!loading && cumpleañerosDelMes.length > 0 && (
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <h2 className="card-title" style={{ color: 'white' }}>
              🎉 Cumpleañeros de {new Date().toLocaleString('es', { month: 'long' }).charAt(0).toUpperCase() + new Date().toLocaleString('es', { month: 'long' }).slice(1)}
            </h2>
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.875rem' }}>
              {cumpleañerosDelMes.length} niño{cumpleañerosDelMes.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="card-content">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {cumpleañerosDelMes.map(nino => (
                <div 
                  key={nino.id} 
                  style={{ 
                    padding: '1rem', 
                    background: 'var(--surface-elevated)', 
                    borderRadius: 'var(--radius)', 
                    border: '1px solid var(--border)'
                  }}
                >
                  <h4 style={{ marginBottom: '0.5rem', fontSize: '1rem', fontWeight: '500' }}>
                    {nino.nombres} {nino.apellidos}
                  </h4>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    <div>🎂 {formatearFecha(nino.fecha_nacimiento)}</div>
                    <div>📅 Cumple {calcularEdad(nino.fecha_nacimiento) + 1} años</div>
                    <div style={{ fontWeight: '500', marginTop: '0.25rem', color: '#f59e0b' }}>
                      🎉 ¡Cumpleaños este mes!
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar' : 'Registrar'} Niño</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Nombres*</label>
                  <input className="input" value={nombres} onChange={e => setNombres(e.target.value)} required />
                </div>
                <div>
                  <label className="label">Apellidos*</label>
                  <input className="input" value={apellidos} onChange={e => setApellidos(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Fecha de Nacimiento*</label>
                  <input type="date" className="input" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} required />
                </div>
              
               <div>
  <label className="label">Código *</label>
  <input 
    className="input" 
    value={codigo} 
    onChange={e => setCodigo(e.target.value)} 
    placeholder="Obligatorio"
    required/>
</div>
              </div>

              <div>
                <label className="label">Asignar a Maestro/a*</label>
                <select className="select" value={maestroId} onChange={e => setMaestroId(e.target.value)} required>
                  <option value="">-- Selecciona un maestro/a --</option>
                  {maestros.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.nombres} {m.apellidos || ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Nivel </label>
                <select className="select" value={nivelId} onChange={e => setNivelId(e.target.value)}>
                  <option value="">Sin nivel</option>
                  {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                </select>
              </div>

              <div>
                <label className="label">Nombre del Encargado</label>
                <input className="input" value={nombreEncargado} onChange={e => setNombreEncargado(e.target.value)} />
              </div>

             <div>
  <label className="label">Teléfono del Encargado (8 dígitos)</label>
  <input 
    className="input" 
    value={telefonoEncargado} 
    onChange={e => {
      // Solo permitir números
      const valor = e.target.value.replace(/\D/g, '')
      // Máximo 8 dígitos
      if (valor.length <= 8) {
        setTelefonoEncargado(valor)
      }
    }}
    placeholder="12345678"
    maxLength={8}
    pattern="\d{8}"
  />
  {telefonoEncargado && telefonoEncargado.length !== 8 && (
    <small style={{ color: '#ef4444', fontSize: '0.875rem', display: 'block', marginTop: '0.25rem' }}>
      Debe tener 8 dígitos
    </small>
  )}
</div>

              <div>
                <label className="label">Dirección del Encargado</label>
                <textarea className="textarea" value={direccionEncargado} onChange={e => setDireccionEncargado(e.target.value)} rows={2} />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
</div> 
  )
} 