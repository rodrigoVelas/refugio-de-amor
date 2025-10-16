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
    <>
      <style>
        {`
          .login-container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            position: relative;
            overflow: hidden;
          }

          .login-container::before {
            content: '';
            position: absolute;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(0, 113, 227, 0.03) 0%, transparent 70%);
            border-radius: 50%;
            top: -150px;
            right: -150px;
          }

          .login-container::after {
            content: '';
            position: absolute;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(0, 113, 227, 0.02) 0%, transparent 70%);
            border-radius: 50%;
            bottom: -100px;
            left: -100px;
          }

          .login-card {
            background: #ffffff;
            border-radius: 18px;
            padding: 3rem 2.5rem;
            width: 100%;
            max-width: 400px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
            position: relative;
            z-index: 1;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid rgba(0, 0, 0, 0.04);
          }

          .login-card:hover {
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
            transform: translateY(-4px);
          }

          .login-logo {
            display: flex;
            justify-content: center;
            margin-bottom: 2rem;
          }

          .login-logo img {
            height: 70px;
            width: auto;
            transition: transform 0.3s ease;
          }

          .login-card:hover .login-logo img {
            transform: scale(1.02);
          }

          .login-title {
            color: #1d1d1f;
            font-size: 1.875rem;
            font-weight: 600;
            text-align: center;
            margin-bottom: 0.5rem;
            letter-spacing: -0.5px;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
          }

          .login-subtitle {
            color: #86868b;
            font-size: 0.9375rem;
            text-align: center;
            margin-bottom: 2rem;
            font-weight: 400;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          }

          .login-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .form-group {
            position: relative;
          }

          .form-label {
            display: block;
            color: #1d1d1f;
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          }

          .login-input {
            width: 100%;
            padding: 0.75rem 1rem;
            background: #f5f5f7;
            border: 1.5px solid transparent;
            border-radius: 10px;
            color: #1d1d1f;
            font-size: 1rem;
            transition: all 0.2s ease;
            outline: none;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          }

          .login-input:hover {
            background: #ebebed;
          }

          .login-input:focus {
            background: #ffffff;
            border-color: #0071e3;
            box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.1);
          }

          .login-input::placeholder {
            color: #86868b;
          }

          .login-btn {
            width: 100%;
            padding: 0.75rem;
            background: #0071e3;
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-top: 0.5rem;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          }

          .login-btn:hover {
            background: #0077ed;
            box-shadow: 0 4px 12px rgba(0, 113, 227, 0.25);
          }

          .login-btn:active {
            transform: scale(0.98);
          }

          .login-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }

          .login-error {
            background: #fff5f5;
            border: 1px solid #feb2b2;
            color: #c53030;
            padding: 0.75rem;
            border-radius: 10px;
            font-size: 0.875rem;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          }

          .login-footer {
            margin-top: 1.5rem;
            text-align: center;
            color: #86868b;
            font-size: 0.8125rem;
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', sans-serif;
          }

          @media (max-width: 768px) {
            .login-card {
              margin: 1rem;
              padding: 2rem 1.5rem;
              box-shadow: none;
              border: none;
            }

            .login-logo img {
              height: 60px;
            }

            .login-title {
              font-size: 1.625rem;
            }
          }
        `}
      </style>

      <div className="login-container">
        <div className="login-card">
          <div className="login-logo">
            <img src="/logo-refugio.png" alt="Refugio de Amor" />
          </div>

          <h1 className="login-title">Refugio de Amor</h1>
          <p className="login-subtitle">Ingresa tus datos para continuar</p>

          <form onSubmit={go} className="login-form">
            <div className="form-group">
              <label className="form-label">Correo</label>
              <input
                className="login-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nombre@ejemplo.com"
                type="email"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                className="login-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                required
              />
            </div>

            {err && <div className="login-error">{err}</div>}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div className="login-footer">
            © {new Date().getFullYear()} Todos los derechos reservados
          </div>
        </div>
      </div>
    </>
  )
}