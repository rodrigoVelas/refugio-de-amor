import { useState, useEffect } from 'react'
import { API_URL } from '../config'

interface Nivel {
  id: string
  nombre: string
}

interface Subnivel {
  id: string
  nombre: string
  nivel_id: string
}

interface Nino {
  id: string
  nombres: string
  apellidos: string
  fecha_nacimiento: string
  genero: string
  nivel_id: string
  subnivel_id: string
  foto_url: string | null
  estado: string
  fecha_ingreso: string
  nivel_nombre: string
  subnivel_nombre: string
}

export default function Ninos() {
  const [ninos, setNinos] = useState<Nino[]>([])
  const [niveles, setNiveles] = useState<Nivel[]>([])
  const [subniveles, setSubniveles] = useState<Subnivel[]>([])
  const [filteredSubniveles, setFilteredSubniveles] = useState<Subnivel[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Filtros
  const [filtroNivel, setFiltroNivel] = useState('')
  const [filtroSubnivel, setFiltroSubnivel] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Form state
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [genero, setGenero] = useState('M')
  const [nivelId, setNivelId] = useState('')
  const [subnivelId, setSubnivelId] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [estado, setEstado] = useState('activo')
  const [fechaIngreso, setFechaIngreso] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    cargarDatos()
  }, [filtroNivel, filtroSubnivel, filtroEstado])

  useEffect(() => {
    if (nivelId) {
      const subs = subniveles.filter(s => s.nivel_id === nivelId)
      setFilteredSubniveles(subs)
      if (!subs.find(s => s.id === subnivelId)) {
        setSubnivelId('')
      }
    } else {
      setFilteredSubniveles([])
      setSubnivelId('')
    }
  }, [nivelId, subniveles, subnivelId])

  async function cargarDatos() {
    try {
      setLoading(true)

      // Cargar niveles
      const nivelesRes = await fetch(`${API_URL}/niveles`, { credentials: 'include' })
      if (nivelesRes.ok) {
        const nivelesData = await nivelesRes.json()
        setNiveles(nivelesData)
      }

      // Cargar subniveles
      const subnivelesRes = await fetch(`${API_URL}/subniveles`, { credentials: 'include' })
      if (subnivelesRes.ok) {
        const subnivelesData = await subnivelesRes.json()
        setSubniveles(subnivelesData)
      }

      // Cargar niños con filtros
      const params = new URLSearchParams()
      if (filtroNivel) params.append('nivel_id', filtroNivel)
      if (filtroSubnivel) params.append('subnivel_id', filtroSubnivel)
      if (filtroEstado) params.append('estado', filtroEstado)

      const ninosUrl = `${API_URL}/ninos${params.toString() ? '?' + params.toString() : ''}`
      const ninosRes = await fetch(ninosUrl, { credentials: 'include' })
      
      if (ninosRes.ok) {
        const ninosData = await ninosRes.json()
        setNinos(ninosData)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  function abrirModal(nino?: Nino) {
    if (nino) {
      setEditingId(nino.id)
      setNombres(nino.nombres)
      setApellidos(nino.apellidos)
      setFechaNacimiento(nino.fecha_nacimiento)
      setGenero(nino.genero)
      setNivelId(nino.nivel_id)
      setSubnivelId(nino.subnivel_id)
      setEstado(nino.estado)
      setFechaIngreso(nino.fecha_ingreso)
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
    setGenero('M')
    setNivelId('')
    setSubnivelId('')
    setFoto(null)
    setEstado('activo')
    setFechaIngreso(new Date().toISOString().split('T')[0])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!nombres.trim() || !apellidos.trim() || !fechaNacimiento || !nivelId || !subnivelId) {
      alert('Completa todos los campos requeridos')
      return
    }

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('nombres', nombres)
      formData.append('apellidos', apellidos)
      formData.append('fecha_nacimiento', fechaNacimiento)
      formData.append('genero', genero)
      formData.append('nivel_id', nivelId)
      formData.append('subnivel_id', subnivelId)
      formData.append('estado', estado)
      formData.append('fecha_ingreso', fechaIngreso)
      if (foto) {
        formData.append('foto', foto)
      }

      const url = editingId ? `${API_URL}/ninos/${editingId}` : `${API_URL}/ninos`
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        credentials: 'include',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        alert(editingId ? 'Niño actualizado' : 'Niño registrado exitosamente')
        setShowModal(false)
        resetForm()
        cargarDatos()
      } else {
        alert(data.error || 'Error al guardar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al guardar niño')
    } finally {
      setUploading(false)
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Estás seguro de eliminar este niño?')) return

    try {
      const res = await fetch(`${API_URL}/ninos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        alert('Niño eliminado')
        cargarDatos()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar niño')
    }
  }

  function calcularEdad(fechaNac: string): number {
    const hoy = new Date()
    const nacimiento = new Date(fechaNac)
    let edad = hoy.getFullYear() - nacimiento.getFullYear()
    const mes = hoy.getMonth() - nacimiento.getMonth()
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--
    }
    return edad
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Gestión de Niños</h1>
          <button className="btn" onClick={() => abrirModal()}>
            Registrar Niño
          </button>
        </div>

        {/* Filtros */}
        <div className="toolbar">
          <select 
            className="select" 
            value={filtroNivel} 
            onChange={(e) => {
              setFiltroNivel(e.target.value)
              setFiltroSubnivel('')
            }}
          >
            <option value="">Todos los niveles</option>
            {niveles.map((n) => (
              <option key={n.id} value={n.id}>{n.nombre}</option>
            ))}
          </select>

          <select 
            className="select" 
            value={filtroSubnivel} 
            onChange={(e) => setFiltroSubnivel(e.target.value)}
            disabled={!filtroNivel}
          >
            <option value="">Todos los subniveles</option>
            {subniveles
              .filter(s => s.nivel_id === filtroNivel)
              .map((s) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
          </select>

          <select 
            className="select" 
            value={filtroEstado} 
            onChange={(e) => setFiltroEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
            <option value="egresado">Egresados</option>
          </select>

          {(filtroNivel || filtroSubnivel || filtroEstado) && (
            <button 
              className="btn btn-ghost" 
              onClick={() => {
                setFiltroNivel('')
                setFiltroSubnivel('')
                setFiltroEstado('')
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Lista de niños */}
        <div className="card-content">
          {loading ? (
            <div className="loading">Cargando niños...</div>
          ) : ninos.length === 0 ? (
            <div className="alert">No hay niños registrados</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {ninos.map((nino) => (
                <div 
                  key={nino.id} 
                  style={{
                    padding: '1rem',
                    background: 'var(--surface-elevated)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {nino.foto_url && (
                    <img 
                      src={nino.foto_url} 
                      alt={nino.nombres}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius)',
                        marginBottom: '0.75rem',
                      }}
                    />
                  )}
                  
                  <h3 style={{ marginBottom: '0.5rem' }}>
                    {nino.nombres} {nino.apellidos}
                  </h3>
                  
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    <div>Edad: {calcularEdad(nino.fecha_nacimiento)} años</div>
                    <div>Género: {nino.genero === 'M' ? 'Masculino' : 'Femenino'}</div>
                    <div>{nino.nivel_nombre} - {nino.subnivel_nombre}</div>
                    <div>
                      Estado: 
                      <span 
                        style={{
                          marginLeft: '0.5rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          background: nino.estado === 'activo' ? '#dcfce7' : '#fee2e2',
                          color: nino.estado === 'activo' ? '#166534' : '#991b1b',
                        }}
                      >
                        {nino.estado}
                      </span>
                    </div>
                  </div>

                  <div className="flex" style={{ gap: '0.5rem', marginTop: '0.75rem' }}>
                    <button 
                      className="btn btn-ghost" 
                      onClick={() => abrirModal(nino)}
                      style={{ flex: 1 }}
                    >
                      Editar
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleEliminar(nino.id)}
                      style={{ flex: 1 }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl">{editingId ? 'Editar Niño' : 'Registrar Niño'}</h2>
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowModal(false)}
                style={{ padding: '0.5rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Nombres*</label>
                  <input
                    type="text"
                    className="input"
                    value={nombres}
                    onChange={(e) => setNombres(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">Apellidos*</label>
                  <input
                    type="text"
                    className="input"
                    value={apellidos}
                    onChange={(e) => setApellidos(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Fecha de Nacimiento*</label>
                  <input
                    type="date"
                    className="input"
                    value={fechaNacimiento}
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="label">Género*</label>
                  <select 
                    className="select" 
                    value={genero} 
                    onChange={(e) => setGenero(e.target.value)}
                    required
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Nivel*</label>
                  <select 
                    className="select" 
                    value={nivelId} 
                    onChange={(e) => setNivelId(e.target.value)}
                    required
                  >
                    <option value="">Selecciona un nivel</option>
                    {niveles.map((n) => (
                      <option key={n.id} value={n.id}>{n.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Subnivel*</label>
                  <select 
                    className="select" 
                    value={subnivelId} 
                    onChange={(e) => setSubnivelId(e.target.value)}
                    required
                    disabled={!nivelId}
                  >
                    <option value="">Selecciona un subnivel</option>
                    {filteredSubniveles.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Estado*</label>
                  <select 
                    className="select" 
                    value={estado} 
                    onChange={(e) => setEstado(e.target.value)}
                    required
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="egresado">Egresado</option>
                  </select>
                </div>

                <div>
                  <label className="label">Fecha de Ingreso*</label>
                  <input
                    type="date"
                    className="input"
                    value={fechaIngreso}
                    onChange={(e) => setFechaIngreso(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Foto</label>
                <input
                  type="file"
                  className="input"
                  accept="image/*"
                  onChange={(e) => setFoto(e.target.files?.[0] || null)}
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setShowModal(false)}
                  disabled={uploading}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn" 
                  disabled={uploading}
                >
                  {uploading ? 'Guardando...' : editingId ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}