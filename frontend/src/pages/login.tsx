import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'

export default function Login({ onDone }: { onDone: (user: any) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const go = async (e: any) => {
    e.preventDefault()
    setErr('')
    setLoading(true)

    try {
      const data = await api.login(email.trim(), password)
      
      console.log('Respuesta del servidor:', data)

      if (data.ok || data.success) {
        // Guardar datos del usuario
        if (data.user) {
          localStorage.setItem('userData', JSON.stringify(data.user))
        }
        if (data.perms) {
          localStorage.setItem('userPerms', JSON.stringify(data.perms))
        }

        console.log('Login exitoso, pasando datos a onDone')
        
        // Preparar datos completos del usuario
        const userData = {
          ...data.user,
          perms: data.perms || []
        }
        
        // Pasar los datos a App.tsx
        onDone(userData)
        
        // Navegar a la ruta correspondiente
        setTimeout(() => {
          const redirectPath = data.redirectTo || '/inicio'
          console.log('Navegando a:', redirectPath)
          navigate(redirectPath)
        }, 100)
        
      } else {
        setErr(data.error || 'Inicio de sesión inválido')
      }
    } catch (error: any) {
      console.error('Error en login:', error)
      setErr(error.message || 'Error de conexión con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f1f5f9' }}>
      <div className="card" style={{ width: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 20 }}>Refugio de Amor</div>
          <div style={{ color: '#64748b', fontSize: 14 }}>Ingresa tus datos para continuar</div>
        </div>

        <form onSubmit={go} className="form">
          <label>Correo</label>
          <input
            className="input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="correo"
            type="email"
            required
          />

          <label>Contraseña</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="********"
            required
          />

          {err && <div className="alert">{err}</div>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <div style={{ fontSize: 12, color: '#64748b', marginTop: '1rem' }}>
            
          </div>
        </form>
      </div>
    </div>
  )
}