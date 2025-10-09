import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function PerfilEditar() {
  const [f, setF] = useState({ nombres: '', apellidos: '', telefono: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    api.perfil_get()
      .then(d => setF({
        nombres: d.nombres || '',
        apellidos: d.apellidos || '',
        telefono: d.telefono || ''
      }))
      .catch(err => {
        console.error('Error cargando perfil:', err)
        setError('No se pudo cargar el perfil')
      })
  }, [])

  const on = (e: any) => setF({ ...f, [e.target.name]: e.target.value })

  const save = async (e: any) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      await api.perfil_update({
        nombres: f.nombres.trim(),
        apellidos: f.apellidos.trim(),
        telefono: f.telefono.trim()
      })
      
      // Actualizar localStorage también
      const userData = localStorage.getItem('userData')
      if (userData) {
        const user = JSON.parse(userData)
        user.nombres = f.nombres.trim()
        user.apellidos = f.apellidos.trim()
        user.name = `${f.nombres.trim()} ${f.apellidos.trim()}`.trim()
        localStorage.setItem('userData', JSON.stringify(user))
      }
      
      navigate('/perfil')
    } catch (err: any) {
      console.error('Error guardando perfil:', err)
      setError(err.message || 'Error al guardar el perfil')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card">
      <h1>Editar Perfil</h1>
      
      {error && <div className="alert" style={{ marginTop: 8 }}>{error}</div>}
      
      <form onSubmit={save} className="form" style={{ marginTop: 8 }}>
        <label>Nombres</label>
        <input 
          className="input" 
          name="nombres" 
          value={f.nombres} 
          onChange={on} 
          required 
        />
        
        <label>Apellidos</label>
        <input 
          className="input" 
          name="apellidos" 
          value={f.apellidos} 
          onChange={on} 
          required 
        />
        
        <label>Teléfono</label>
        <input 
          className="input" 
          name="telefono" 
          value={f.telefono} 
          onChange={on}
          type="tel"
        />
        
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button 
            className="btn" 
            type="button" 
            onClick={() => navigate('/perfil')}
            style={{ background: '#64748b' }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}