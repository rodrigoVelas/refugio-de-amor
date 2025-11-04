import { useState, useEffect } from 'react'
import { API_URL } from '../config'
import Swal from 'sweetalert2'

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
  subido_por: string
  subido_por_nombre: string
  fecha_subida: string
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
        console.log('👤 Usuario:', userData.email, '| Rol:', userData.rol)
        setUsuario(userData)
      }

      // Obtener documentos
      const res = await fetch(`${API_URL}/documentos`, { credentials: 'include' })
      
      if (res.ok) {
        const data = await res.json()
        console.log('📄 Documentos:', data.length)
        setDocumentos(data)
      }
    } catch (error) {
      console.error('❌ Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const esDirectora = usuario ? String(usuario.rol).toLowerCase() === 'directora' : false

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

      console.log('📤 Subiendo:', archivo.name)

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

  async function verDocumento(doc: Documento) {
    try {
      const esPDF = doc.archivo_tipo === 'application/pdf'
      const esImagen = doc.archivo_tipo.startsWith('image/')

      if (esImagen) {
        Swal.fire({
          title: doc.titulo,
          imageUrl: doc.archivo_url,
          imageAlt: doc.titulo,
          width: 800,
          confirmButtonColor: '#3b82f6',
          showCloseButton: true
        })
      } else {
        // Abrir en nueva pestaña
        window.open(doc.archivo_url, '_blank')
      }
    } catch (error) {
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
        text: 'Solo la directora puede eliminar',
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
    if (tipo === 'application/pdf') return '📄'
    if (tipo.startsWith('image/')) return '🖼️'
    if (tipo.includes('word')) return '📝'
    if (tipo.includes('excel') || tipo.includes('spreadsheet')) return '📊'
    return '📎'
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
      setArchivo(file)
    }
  }

  return (
    <div className="content">
      <div className="card">
        <div className="card-header">
          <div>
            <h1 className="card-title">Documentos</h1>
            {usuario && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                {esDirectora ? '👑 Directora - Puedes subir y eliminar' : '👤 Puedes ver y descargar'}
              </p>
            )}
          </div>
          {esDirectora ? (
            <button className="btn" onClick={abrirModal}>
              Subir Documento
            </button>
          ) : (
            <div style={{ padding: '0.5rem 1rem', background: 'var(--surface-elevated)', borderRadius: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Solo lectura
            </div>
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
                      {getIconoTipo(doc.archivo_tipo)}
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
                        <div>📎 {doc.archivo_nombre}</div>
                        <div>💾 {formatearTamano(doc.archivo_size)}</div>
                        <div>📤 {doc.subido_por_nombre}</div>
                        <div>📅 {formatearFecha(doc.fecha_subida)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-ghost"
                      onClick={() => verDocumento(doc)}
                      style={{ flex: '1 1 auto' }}
                    >
                      {doc.archivo_tipo.startsWith('image/') ? 'Ver' : 'Abrir'}
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

      {showModal && (
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