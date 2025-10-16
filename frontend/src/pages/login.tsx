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
            background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0a0e27 100%);
            position: relative;
            overflow: hidden;
          }

          .login-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
              radial-gradient(circle at 20% 50%, rgba(37, 99, 235, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);
            pointer-events: none;
          }

          .login-card {
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 3rem;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            position: relative;
            z-index: 1;
          }

          .login-logo {
            display: flex;
            justify-content: center;
            margin-bottom: 2.5rem;
          }

          .login-logo img {
            height: 80px;
            width: auto;
            filter: brightness(1.1);
          }

          .login-title {
            color: #ffffff;
            font-size: 1.75rem;
            font-weight: 700;
            text-align: center;
            margin-bottom: 0.5rem;
            letter-spacing: 0.5px;
          }

          .login-subtitle {
            color: rgba(255, 255, 255, 0.5);
            font-size: 0.875rem;
            text-align: center;
            margin-bottom: 2rem;
          }

          .login-form {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
          }

          .form-group {
            position: relative;
          }

          .form-label {
            display: block;
            color: rgba(255, 255, 255, 0.7);
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
            font-weight: 500;
            letter-spacing: 0.5px;
          }

          .login-input {
            width: 100%;
            padding: 1rem 1.25rem;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: #ffffff;
            font-size: 1rem;
            transition: all 0.3s ease;
            outline: none;
          }

          .login-input:focus {
            background: rgba(255, 255, 255, 0.08);
            border-color: rgba(37, 99, 235, 0.5);
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1);
          }

          .login-input::placeholder {
            color: rgba(255, 255, 255, 0.3);
          }

          .login-btn {
            width: 100%;
            padding: 1rem;
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            letter-spacing: 0.5px;
            position: relative;
            overflow: hidden;
          }

          .login-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s ease;
          }

          .login-btn:hover::before {
            left: 100%;
          }

          .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(37, 99, 235, 0.4);
          }

          .login-btn:active {
            transform: translateY(0);
          }

          .login-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
          }

          .login-error {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #fca5a5;
            padding: 0.875rem 1rem;
            border-radius: 10px;
            font-size: 0.875rem;
            text-align: center;
            animation: shake 0.4s ease;
          }

          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }

          .login-footer {
            margin-top: 2rem;
            text-align: center;
            color: rgba(255, 255, 255, 0.4);
            font-size: 0.875rem;
          }

          @media (max-width: 768px) {
            .login-card {
              margin: 1rem;
              padding: 2rem;
            }

            .login-logo img {
              height: 60px;
            }

            .login-title {
              font-size: 1.5rem;
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
                placeholder="tu@email.com"
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
                placeholder="••••••••"
                required
              />
            </div>

            {err && <div className="login-error">{err}</div>}

            <button className="login-btn" type="submit" disabled={loading}>
              {loading ? 'Ingresando...' : 'Ingresar'}
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