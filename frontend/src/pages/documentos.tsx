import { useState, useEffect } from 'react'
import { API_URL } from '../config'
import Swal from 'sweetalert2'

interface Documento {
  id: string
  titulo: string
  descripcion: string | null
  tipo: string
  nombre_archivo: string
  tamano_bytes: number
  mime_type: string
  subido_por: string
  subido_por_nombre: string
  creado_en: string
}

interface Usuario {
  id: string
  email: string
  nombres: string
  rol: string
}

export default function Documentos() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)

  // Form state
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      setLoading(true)

      // Obtener usuario actual
      const userRes = await fetch(`${API_URL}/auth/me`, { credentials: 'include' })
      if (userRes.ok) {
        const userData = await userRes.json()
        setUsuario(userData)
        console.log('👤 Usuario:', userData.email, '| Rol:', userData.rol)
      }

      // Obtener documentos
      const res = await fetch(`${API_URL}/documentos`, { credentials: 'include' })
      
      if (res.ok) {
        const data = await res.json()
        console.log('📄 Documentos cargados:', data.length)
        setDocumentos(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const esDirectora = String(usuario?.rol) === '1'

  function abrirModal() {
    if (!esDirectora) {
      Swal.fire({
        icon: 'error',
        title: 'Acceso denegado',
        text: 'Solo la directora puede subir documentos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    setTitulo('')
    setDescripcion('')
    setArchivo(null)
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!titulo.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Título requerido',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    if (!archivo) {
      Swal.fire({
        icon: 'warning',
        title: 'Archivo requerido',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    // Validar tamaño (10MB)
    if (archivo.size > 10 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'Archivo muy grande',
        text: 'Máximo 10MB',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('titulo', titulo.trim())
      if (descripcion.trim()) formData.append('descripcion', descripcion.trim())
      formData.append('archivo', archivo)

      console.log('📤 Subiendo:', archivo.name, '(', (archivo.size / 1024).toFixed(2), 'KB)')

      const res = await fetch(`${API_URL}/documentos`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        await Swal.fire({
          icon: 'success',
          title: '¡Subido!',
          timer: 2000,
          showConfirmButton: false
        })
        setShowModal(false)
        cargarDatos()
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.error,
          confirmButtonColor: '#3b82f6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al subir',
        confirmButtonColor: '#3b82f6'
      })
    } finally {
      setUploading(false)
    }
  }

  async function descargarDocumento(id: string, nombreArchivo: string) {
    try {
      console.log('📥 Descargando:', id)

      const res = await fetch(`${API_URL}/documentos/${id}/descargar`, {
        credentials: 'include'
      })

      if (!res.ok) {
        throw new Error('Error al descargar')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombreArchivo
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      console.log('✅ Descargado')
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al descargar',
        confirmButtonColor: '#3b82f6'
      })
    }
  }

  async function verDocumento(doc: Documento) {
    try {
      console.log('👁️ Viendo:', doc.id)

      const res = await fetch(`${API_URL}/documentos/${doc.id}`, {
        credentials: 'include'
      })

      if (!res.ok) {
        throw new Error('Error al cargar')
      }

      const data = await res.json()

      // Si es imagen, mostrar en modal
      if (doc.tipo === 'imagen') {
        const base64Img = `data:${data.mime_type};base64,${data.contenido_base64}`
        Swal.fire({
          title: doc.titulo,
          imageUrl: base64Img,
          imageAlt: doc.titulo,
          width: 800,
          confirmButtonColor: '#3b82f6'
        })
      } else {
        // Para PDF y otros, descargar directamente
        descargarDocumento(doc.id, doc.nombre_archivo)
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al ver documento',
        confirmButtonColor: '#3b82f6'
      })
    }
  }

  async function handleEliminar(id: string, titulo: string) {
    if (!esDirectora) {
      Swal.fire({
        icon: 'error',
        title: 'Acceso denegado',
        text: 'Solo la directora puede eliminar documentos',
        confirmButtonColor: '#3b82f6'
      })
      return
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar?',
      text: `¿Eliminar "${titulo}"?`,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      const res = await fetch(`${API_URL}/documentos/${id}`, {
        method: 'DELETE',
        credentials: 'include'
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

  function getIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'pdf': return '📄'
      case 'imagen': return '🖼️'
      case 'word': return '📝'
      case 'excel': return '📊'
      case 'texto': return '📃'
      default: return '📎'
    }
  }

  function formatearTamano(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  function formatearFecha(fecha: string): string {
    const date = new Date(fecha)
    return date.toLocaleDateString('es-GT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      console.log('📎 Seleccionado:', file.name, formatearTamano(file.size))
      setArchivo(file)
    }
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">Documentos</h1>
            {!esDirectora && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                Puedes ver y descargar documentos
              </p>
            )}
          </div>
          {esDirectora && (
            <button className="btn" onClick={abrirModal}>
              Subir Documento
            </button>
          )}
        </div>

        <div className="card-content">
          {loading ? (
            <div className="loading">Cargando...</div>
          ) : documentos.length === 0 ? (
            <div className="alert" style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
                No hay documentos
              </p>
              {esDirectora && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Haz clic en "Subir Documento"
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {documentos.map(doc => (
                <div key={doc.id} style={{ padding: '1.25rem', background: 'var(--surface-elevated)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '2.5rem' }}>
                      {getIconoTipo(doc.tipo)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: '500' }}>
                        {doc.titulo}
                      </h3>
                      {doc.descripcion && (
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                          {doc.descripcion}
                        </p>
                      )}
                      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <div>📎 {doc.nombre_archivo}</div>
                        <div>💾 {formatearTamano(doc.tamano_bytes)}</div>
                        <div>📤 {doc.subido_por_nombre}</div>
                        <div>📅 {formatearFecha(doc.creado_en)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-ghost"
                      onClick={() => verDocumento(doc)}
                      style={{ flex: '1 1 auto' }}
                    >
                      {doc.tipo === 'imagen' ? 'Ver' : 'Descargar'}
                    </button>
                    {esDirectora && (
                      <button 
                        className="btn btn-danger" 
                        onClick={() => handleEliminar(doc.id, doc.titulo)}
                        style={{ flex: '1 1 auto' }}
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && esDirectora && (
        <div className="modal-backdrop" onClick={() => !uploading && setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Subir Documento</h2>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={uploading}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="form">
              <div>
                <label className="label">Título*</label>
                <input 
                  className="input" 
                  value={titulo} 
                  onChange={e => setTitulo(e.target.value)} 
                  placeholder="Nombre del documento"
                  required
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="label">Descripción</label>
                <textarea 
                  className="textarea" 
                  value={descripcion} 
                  onChange={e => setDescripcion(e.target.value)} 
                  placeholder="Opcional"
                  rows={3}
                  disabled={uploading}
                />
              </div>

              <div>
                <label className="label">Archivo* (máx. 10MB)</label>
                <input 
                  type="file"
                  className="input"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt"
                  required
                  disabled={uploading}
                />
                <small style={{ display: 'block', marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
                  PDF, Imágenes, Word, Excel, Texto
                </small>
                {archivo && (
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'var(--surface-elevated)', borderRadius: '6px', fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>📎 {archivo.name}</div>
                    <div style={{ color: 'var(--text-secondary)' }}>💾 {formatearTamano(archivo.size)}</div>
                  </div>
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
                  {uploading ? 'Subiendo...' : 'Subir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}