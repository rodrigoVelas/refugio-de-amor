import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Swal from 'sweetalert2'

interface Nino {
  id: string
  codigo: string
  nombres: string
  apellidos: string
  fecha_nacimiento: string | null
  genero: string | null
  direccion: string | null
  telefono_contacto: string | null
  nombre_encargado: string | null
  nivel_id: string | null
  subnivel_id: string | null
  maestro_id: string | null
  nivel_nombre: string | null
  subnivel_nombre: string | null
  colaborador_nombre: string | null
  colaborador_apellidos: string | null
  activo: boolean
}

interface Usuario {
  id: string
  email: string
  nombres: string
  rol: string
}

export default function Ninos() {
  const navigate = useNavigate()
  const [ninos, setNinos] = useState<Nino[]>([])
  const [loading, setLoading] = useState(true)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [mostrarModal, setMostrarModal] = useState(false)
  
  // Formulario
  const [codigo, setCodigo] = useState('')
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [genero, setGenero] = useState('')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nombreEncargado, setNombreEncargado] = useState('')
  const [nivelId, setNivelId] = useState('')
  const [subnivelId, setSubnivelId] = useState('')
  const [maestroId, setMaestroId] = useState('')
  const [guardando, setGuardando] = useState(false)
  
  // Datos auxiliares
  const [niveles, setNiveles] = useState<any[]>([])
  const [subniveles, setSubniveles] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (busqueda) {
      const timer = setTimeout(() => cargarNinos(), 500)
      return () => clearTimeout(timer)
    } else {
      cargarNinos()
    }
  }, [busqueda])

  useEffect(() => {
    if (nivelId) {
      cargarSubniveles(nivelId)
    } else {
      setSubniveles([])
      setSubnivelId('')
    }
  }, [nivelId])

  async function cargarDatos() {
    try {
      const [ninosData, userData, nivelesData, usuariosData] = await Promise.all([
        api.ninos_list(),
        api.me(),
        api.niveles_list(),
        api.usuarios_list()
      ])
      
      setNinos(ninosData)
      setUsuario(userData)
      setNiveles(nivelesData)
      setUsuarios(usuariosData.filter((u: any) => u.rol === 'colaboradores' || u.rol === 'directora'))
    } catch (error) {
      console.error('Error:', error)
      Swal.fire('Error', 'No se pudieron cargar los datos', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function cargarNinos() {
    try {
      const data = await api.ninos_list(busqueda)
      setNinos(data)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  async function cargarSubniveles(nivel_id: string) {
    try {
      const data = await api.subniveles_list()
      const filtrados = data.filter((s: any) => s.nivel_id === nivel_id)
      setSubniveles(filtrados)
    } catch (error) {
      console.error('Error:', error)
      setSubniveles([])
    }
  }

  function handleTelefonoChange(valor: string) {
    const soloNumeros = valor.replace(/\D/g, '')
    if (soloNumeros.length <= 8) {
      setTelefono(soloNumeros)
    }
  }

  function abrirModal() {
    setCodigo('')
    setNombres('')
    setApellidos('')
    setFechaNacimiento('')
    setGenero('')
    setDireccion('')
    setTelefono('')
    setNombreEncargado('')
    setNivelId('')
    setSubnivelId('')
    setMaestroId('')
    setMostrarModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!codigo.trim() || !nombres.trim() || !apellidos.trim()) {
      Swal.fire('Error', 'Código, nombres y apellidos son obligatorios', 'error')
      return
    }

    if (telefono && telefono.length !== 8) {
      Swal.fire('Error', 'El teléfono debe tener exactamente 8 dígitos', 'error')
      return
    }

    setGuardando(true)
    try {
      await api.ninos_create({
        codigo: codigo.trim(),
        nombres: nombres.trim(),
        apellidos: apellidos.trim(),
        fecha_nacimiento: fechaNacimiento || null,
        genero: genero || null,
        direccion: direccion.trim() || null,
        telefono_contacto: telefono || null,
        nombre_encargado: nombreEncargado.trim() || null,
        nivel_id: nivelId || null,
        subnivel_id: subnivelId || null,
        maestro_id: maestroId || null
      })

      await Swal.fire('¡Éxito!', 'Niño agregado correctamente', 'success')
      setMostrarModal(false)
      cargarNinos()
    } catch (error: any) {
      console.error('Error:', error)
      Swal.fire('Error', error.message || 'No se pudo agregar el niño', 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id: string, nombre: string) {
    const result = await Swal.fire({
      title: '¿Eliminar niño?',
      text: `Se eliminará a ${nombre}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (result.isConfirmed) {
      try {
        await api.ninos_delete(id)
        await Swal.fire('¡Eliminado!', 'Niño eliminado correctamente', 'success')
        cargarNinos()
      } catch (error: any) {
        console.error('Error:', error)
        Swal.fire('Error', 'No se pudo eliminar el niño', 'error')
      }
    }
  }

  const puedeGestionar = usuario?.rol === 'directora'

  if (loading) {
    return <div className="loading">Cargando niños...</div>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>👶 Niños</h1>
          <p style={{ color: '#6b7280' }}>Gestión de niños registrados</p>
        </div>
        {puedeGestionar && (
          <button onClick={abrirModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
            <span style={{ fontSize: '1.25rem' }}>➕</span>Agregar Niño
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar por nombre, apellido o código..."
          className="form-input"
          style={{ fontSize: '1rem' }}
        />
      </div>

      {ninos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>👶</p>
          <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>No hay niños registrados</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {ninos.map((nino) => (
            <div key={nino.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
                    {nino.nombres} {nino.apellidos}
                  </h3>
                  <span style={{ padding: '0.25rem 0.75rem', background: '#dbeafe', color: '#1e40af', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '500' }}>
                    {nino.codigo}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: '#6b7280', flexWrap: 'wrap' }}>
                  {nino.nivel_nombre && <span>📚 {nino.nivel_nombre}</span>}
                  {nino.colaborador_nombre && <span>👤 {nino.colaborador_nombre}</span>}
                  {nino.telefono_contacto && <span>📞 {nino.telefono_contacto}</span>}
                  {nino.nombre_encargado && <span>👨‍👩‍👧‍👦 {nino.nombre_encargado}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => navigate(`/ninos/${nino.id}`)} className="btn" style={{ background: '#3b82f6', color: 'white' }}>Ver</button>
                {puedeGestionar && (
                  <button onClick={() => handleEliminar(nino.id, `${nino.nombres} ${nino.apellidos}`)} className="btn" style={{ background: '#ef4444', color: 'white' }}>🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '2rem',
              paddingBottom: '1rem',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0, color: '#1f2937' }}>
                ➕ Agregar Nuevo Niño
              </h2>
              <button onClick={() => setMostrarModal(false)} style={{ background: '#f3f4f6', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.25rem', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                {/* Sección: Datos Personales */}
                <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#374151' }}>
                    📋 Datos Personales
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Código *</label>
                      <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} className="form-input" placeholder="N001" required style={{ fontSize: '1rem' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Género</label>
                      <select value={genero} onChange={(e) => setGenero(e.target.value)} className="form-input" style={{ fontSize: '1rem' }}>
                        <option value="">Seleccionar...</option>
                        <option value="Masculino">👦 Masculino</option>
                        <option value="Femenino">👧 Femenino</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Nombres *</label>
                      <input type="text" value={nombres} onChange={(e) => setNombres(e.target.value)} className="form-input" placeholder="Nombres del niño" required style={{ fontSize: '1rem' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Apellidos *</label>
                      <input type="text" value={apellidos} onChange={(e) => setApellidos(e.target.value)} className="form-input" placeholder="Apellidos del niño" required style={{ fontSize: '1rem' }} />
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Fecha de Nacimiento</label>
                      <input type="date" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(e.target.value)} className="form-input" style={{ fontSize: '1rem' }} />
                    </div>
                  </div>
                </div>

                {/* Sección: Contacto */}
                <div style={{ background: '#eff6ff', padding: '1.5rem', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#1e40af' }}>
                    📞 Información de Contacto
                  </h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Nombre del Encargado
                      </label>
                      <input type="text" value={nombreEncargado} onChange={(e) => setNombreEncargado(e.target.value)} className="form-input" placeholder="Nombre completo del padre/madre/encargado" style={{ fontSize: '1rem' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        Teléfono de Contacto (8 dígitos) {telefono && <span style={{ color: telefono.length === 8 ? '#10b981' : '#ef4444' }}>({telefono.length}/8)</span>}
                      </label>
                      <input
                        type="text"
                        value={telefono}
                        onChange={(e) => handleTelefonoChange(e.target.value)}
                        className="form-input"
                        placeholder="12345678"
                        maxLength={8}
                        style={{ 
                          fontSize: '1rem',
                          borderColor: telefono && telefono.length !== 8 && telefono.length > 0 ? '#ef4444' : telefono.length === 8 ? '#10b981' : undefined,
                          borderWidth: telefono.length > 0 ? '2px' : '2px'
                        }}
                      />
                      {telefono && telefono.length > 0 && telefono.length !== 8 && (
                        <p style={{ fontSize: '0.875rem', color: '#ef4444', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          ⚠️ Debe tener exactamente 8 dígitos
                        </p>
                      )}
                      {telefono.length === 8 && (
                        <p style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          ✅ Teléfono válido
                        </p>
                      )}
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Dirección</label>
                      <textarea value={direccion} onChange={(e) => setDireccion(e.target.value)} className="form-input" rows={2} placeholder="Dirección completa" style={{ fontSize: '1rem' }} />
                    </div>
                  </div>
                </div>

                {/* Sección: Académico */}
                <div style={{ background: '#fef3c7', padding: '1.5rem', borderRadius: '8px' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#92400e' }}>
                    🎓 Información Académica
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Nivel</label>
                      <select value={nivelId} onChange={(e) => setNivelId(e.target.value)} className="form-input" style={{ fontSize: '1rem' }}>
                        <option value="">Seleccionar...</option>
                        {niveles.map((n) => (<option key={n.id} value={n.id}>{n.nombre}</option>))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Subnivel</label>
                      <select value={subnivelId} onChange={(e) => setSubnivelId(e.target.value)} className="form-input" disabled={!nivelId} style={{ fontSize: '1rem' }}>
                        <option value="">Seleccionar...</option>
                        {subniveles.map((s) => (<option key={s.id} value={s.id}>{s.nombre}</option>))}
                      </select>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>Colaborador Asignado</label>
                      <select value={maestroId} onChange={(e) => setMaestroId(e.target.value)} className="form-input" style={{ fontSize: '1rem' }}>
                        <option value="">Sin asignar</option>
                        {usuarios.map((u) => (<option key={u.id} value={u.id}>{u.nombres} {u.apellidos}</option>))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '1rem', 
                marginTop: '2rem',
                paddingTop: '1.5rem',
                borderTop: '2px solid #e5e7eb'
              }}>
                <button type="button" onClick={() => setMostrarModal(false)} className="btn" disabled={guardando} style={{ flex: 1, fontSize: '1rem', padding: '0.75rem' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={guardando || (telefono.length > 0 && telefono.length !== 8)} style={{ flex: 1, fontSize: '1rem', padding: '0.75rem' }}>
                  {guardando ? '⏳ Guardando...' : '✅ Guardar Niño'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}