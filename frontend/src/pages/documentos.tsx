import { useState, useEffect } from 'react'
import { API_URL } from '../config'

interface Documento {
  id: string
  titulo: string
  descripcion: string | null
  archivo_nombre: string
  archivo_tipo: string
  archivo_size: number
  archivo_url: string
  mes: number
  anio: number
  fecha_subida: string
  subido_por: string
  subido_por_nombre: string
}

const meses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

export default function Documentos() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filtroMes, setFiltroMes] = useState('')
  const [filtroAnio, setFiltroAnio] = useState('')

  // Form state
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [archivo, setArchivo] = useState<File | null>(null)

  useEffect(() => {
    cargarDocumentos()
  }, [filtroMes, filtroAnio])

  async function cargarDocumentos() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroMes) params.append('mes', filtroMes)
      if (filtroAnio) params.append('anio', filtroAnio)

      const url = `${API_URL}/documentos${params.toString() ? '?' + params.toString() : ''}`
      const res = await fetch(url, { credentials: 'include' })
      
      if (res.ok) {
        const data = await res.json()
        setDocumentos(data)
      }
    } catch (error) {
      console.error('Error cargando documentos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!archivo) {
      alert('Selecciona un archivo')
      return
    }

    if (!titulo.trim()) {
      alert('Ingresa un título')
      return
    }

    try {
      setUploading(true)
      
      const formData = new FormData()
      formData.append('archivo', archivo)
      formData.append('titulo', titulo)
      formData.append('descripcion', descripcion)
      formData.append('mes', mes.toString())
      formData.append('anio', anio.toString())

      const res = await fetch(`${API_URL}/documentos/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await res.json()

      if (res.ok) {
        alert('Documento subido exitosamente')
        setShowModal(false)
        resetForm()
        cargarDocumentos()
      } else {
        alert(data.error || 'Error al subir documento')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al subir documento')
    } finally {
      setUploading(false)
    }
  }

  function resetForm() {
    setTitulo('')
    setDescripcion('')
    setMes(new Date().getMonth() + 1)
    setAnio(new Date().getFullYear())
    setArchivo(null)
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Estás seguro de eliminar este documento?')) return

    try {
      const res = await fetch(`${API_URL}/documentos/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        alert('Documento eliminado')
        cargarDocumentos()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar documento')
    }
  }

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function getFileIcon(tipo: string): string {
    if (tipo.includes('pdf')) return '📄'
    if (tipo.includes('word')) return '📝'
    if (tipo.includes('excel') || tipo.includes('spreadsheet')) return '📊'
    return '📎'
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Documentos Mensuales</h1>
          <button className="btn" onClick={() => setShowModal(true)}>
            <i className="material-icons">add</i>
            Subir Documento
          </button>
        </div>

        {/* Filtros */}
        <div className="toolbar">
          <select 
            className="select" 
            value={filtroMes} 
            onChange={(e) => setFiltroMes(e.target.value)}
          >
            <option value="">Todos los meses</option>
            {meses.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>

          <select 
            className="select" 
            value={filtroAnio} 
            onChange={(e) => setFiltroAnio(e.target.value)}
          >
            <option value="">Todos los años</option>
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {(filtroMes || filtroAnio) && (
            <button 
              className="btn btn-ghost" 
              onClick={() => { setFiltroMes(''); setFiltroAnio('') }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Lista de documentos */}
        <div className="card-content">
          {loading ? (
            <div className="loading">Cargando documentos...</div>
          ) : documentos.length === 0 ? (
            <div className="alert">No hay documentos disponibles</div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {documentos.map((doc) => (
                <div 
                  key={doc.id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: 'var(--surface-elevated)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: '2rem' }}>
                    {getFileIcon(doc.archivo_tipo)}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginBottom: '0.25rem' }}>{doc.titulo}</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {meses[doc.mes - 1]} {doc.anio} • {formatFileSize(doc.archivo_size)}
                    </p>
                    {doc.descripcion && (
                      <p className="text-sm" style={{ marginTop: '0.5rem' }}>
                        {doc.descripcion}
                      </p>
                    )}
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                      Subido por {doc.subido_por_nombre} el {new Date(doc.fecha_subida).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex" style={{ gap: '0.5rem' }}>
                    <a 
                      href={doc.archivo_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-ghost"
                    >
                      <i className="material-icons">download</i>
                      Descargar
                    </a>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => handleEliminar(doc.id)}
                    >
                      <i className="material-icons">delete</i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de subida */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-xl">Subir Documento</h2>
              <button 
                className="btn btn-ghost" 
                onClick={() => setShowModal(false)}
                style={{ padding: '0.5rem' }}
              >
                <i className="material-icons">close</i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <div>
                <label className="label">Título*</label>
                <input
                  type="text"
                  className="input"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="label">Descripción</label>
                <textarea
                  className="textarea"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  rows={3}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="label">Mes*</label>
                  <select 
                    className="select" 
                    value={mes} 
                    onChange={(e) => setMes(Number(e.target.value))}
                    required
                  >
                    {meses.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Año*</label>
                  <input
                    type="number"
                    className="input"
                    value={anio}
                    onChange={(e) => setAnio(Number(e.target.value))}
                    min={2020}
                    max={2050}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Archivo* (PDF, Word, Excel - Max 10MB)</label>
                <input
                  type="file"
                  className="input"
                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                  required
                />
                {archivo && (
                  <p className="text-sm" style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                    {archivo.name} ({formatFileSize(archivo.size)})
                  </p>
                )}
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
                  {uploading ? 'Subiendo...' : 'Subir Documento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}