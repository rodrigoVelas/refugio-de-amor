import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import Swal from 'sweetalert2'

interface Documento {
  id: string
  titulo: string
  descripcion: string | null
  mes: number
  anio: number
  archivo_url: string | null
  archivo_nombre: string | null
  archivo_tipo: string | null
  archivo_size: number | null
  subido_por: string
  subido_por_nombre: string | null
  subido_por_apellidos: string | null
  fecha_subida: string
  activo: boolean
}

interface Usuario {
  id: string
  email: string
  nombres: string
  rol: string
}

export default function Documentos() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [archivoUrl, setArchivoUrl] = useState('')
  const [guardando, setGuardando] = useState(false)

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      const [docsData, userData] = await Promise.all([api.documentos_list(), api.me()])
      setDocumentos(docsData)
      setUsuario(userData)
    } catch (error) {
      console.error('Error:', error)
      Swal.fire('Error', 'No se pudieron cargar los documentos', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !mes || !anio) {
      Swal.fire('Error', 'Título, mes y año son obligatorios', 'error')
      return
    }
    setGuardando(true)
    try {
      await api.documentos_create({ titulo: titulo.trim(), descripcion: descripcion.trim() || null, mes, anio, archivo_url: archivoUrl.trim() || null, archivo_nombre: titulo.trim(), archivo_tipo: 'pdf', archivo_size: null })
      await Swal.fire('¡Éxito!', 'Documento agregado correctamente', 'success')
      setTitulo('')
      setDescripcion('')
      setMes(new Date().getMonth() + 1)
      setAnio(new Date().getFullYear())
      setArchivoUrl('')
      setMostrarModal(false)
      cargarDatos()
    } catch (error: any) {
      console.error('Error:', error)
      Swal.fire('Error', error.message || 'No se pudo agregar el documento', 'error')
    } finally {
      setGuardando(false)
    }
  }

  async function handleEliminar(id: string, titulo: string) {
    const result = await Swal.fire({ title: '¿Eliminar documento?', text: `Se eliminará "${titulo}"`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#6b7280', confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar' })
    if (result.isConfirmed) {
      try {
        await api.documentos_delete(id)
        await Swal.fire('¡Eliminado!', 'Documento eliminado correctamente', 'success')
        cargarDatos()
      } catch (error: any) {
        console.error('Error:', error)
        Swal.fire('Error', 'No se pudo eliminar el documento', 'error')
      }
    }
  }

  const puedeGestionar = usuario?.rol === 'directora' || usuario?.rol === 'contabilidad'

  if (loading) return <div className="loading">Cargando documentos...</div>

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>📄 Documentos Mensuales</h1>
          <p style={{ color: '#6b7280' }}>Gestión de documentos y reportes mensuales</p>
        </div>
        {puedeGestionar && (
          <button onClick={() => setMostrarModal(true)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>➕</span>Agregar Documento
          </button>
        )}
      </div>

      {documentos.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</p>
          <p style={{ fontSize: '1.25rem', color: '#6b7280' }}>No hay documentos registrados</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {documentos.map((doc) => (
            <div key={doc.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>{doc.titulo}</h3>
                  <span style={{ padding: '0.25rem 0.75rem', background: '#dbeafe', color: '#1e40af', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: '500' }}>
                    {meses[doc.mes - 1]} {doc.anio}
                  </span>
                </div>
                {doc.descripcion && <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>{doc.descripcion}</p>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.875rem', color: '#9ca3af' }}>
                  <span>👤 {doc.subido_por_nombre} {doc.subido_por_apellidos || ''}</span>
                  <span>📅 {new Date(doc.fecha_subida).toLocaleDateString('es-GT')}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {doc.archivo_url && (
                  <a href={doc.archivo_url} target="_blank" rel="noopener noreferrer" className="btn" style={{ background: '#3b82f6', color: 'white' }}>📥 Ver</a>
                )}
                {puedeGestionar && (
                  <button onClick={() => handleEliminar(doc.id, doc.titulo)} className="btn" style={{ background: '#ef4444', color: 'white' }}>🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Agregar Documento</h2>
              <button onClick={() => setMostrarModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Título *</label>
                  <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className="form-input" placeholder="Ej: Reporte Mensual de Actividades" required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Descripción</label>
                  <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="form-input" rows={3} placeholder="Descripción opcional del documento" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Mes *</label>
                    <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))} className="form-input" required>
                      {meses.map((m, idx) => (<option key={idx} value={idx + 1}>{m}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Año *</label>
                    <input type="number" value={anio} onChange={(e) => setAnio(parseInt(e.target.value))} className="form-input" min="2020" max="2030" required />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>URL del Archivo (opcional)</label>
                  <input type="url" value={archivoUrl} onChange={(e) => setArchivoUrl(e.target.value)} className="form-input" placeholder="https://ejemplo.com/documento.pdf" />
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>Puedes pegar un enlace de Google Drive, Dropbox, etc.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setMostrarModal(false)} className="btn" disabled={guardando}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}