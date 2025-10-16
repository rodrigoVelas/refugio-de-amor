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
            background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
            position: relative;
            overflow: hidden;
          }

          .login-container::before {
            content: '';
            position: absolute;
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
            border-radius: 50%;
            top: -100px;
            left: -100px;
            animation: float 8s ease-in-out infinite;
          }

          .login-container::after {
            content: '';
            position: absolute;
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            border-radius: 50%;
            bottom: -50px;
            right: -50px;
            animation: float 6s ease-in-out infinite reverse;
          }

          @keyframes float {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(30px, -30px) scale(1.1); }
          }

          .login-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 2.5rem;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
            position: relative;
            z-index: 1;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .login-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
          }

          .login-logo {
            display: flex;
            justify-content: center;
            margin-bottom: 2rem;
            animation: fadeInDown 0.6s ease;
          }

          .login-logo img {
            height: 80px;
            width: auto;
            transition: transform 0.3s ease;
          }

          .login-card:hover .login-logo img {
            transform: scale(1.05);
          }

          @keyframes fadeInDown {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .login-title {
            color: #1e293b;
            font-size: 1.75rem;
            font-weight: 700;
            text-align: center;
            margin-bottom: 0.5rem;
            letter-spacing: -0.5px;
            animation: fadeIn 0.6s ease 0.2s backwards;
          }

          .login-subtitle {
            color: #64748b;
            font-size: 0.875rem;
            text-align: center;
            margin-bottom: 2rem;
            animation: fadeIn 0.6s ease 0.3s backwards;
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          .login-form {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            animation: fadeIn 0.6s ease 0.4s backwards;
          }

          .form-group {
            position: relative;
          }

          .form-label {
            display: block;
            color: #475569;
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
          }

          .login-input {
            width: 100%;
            padding: 0.875rem 1rem;
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            color: #1e293b;
            font-size: 1rem;
            transition: all 0.3s ease;
            outline: none;
          }

          .login-input:focus {
            background: #ffffff;
            border-color: #667eea;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
          }

          .login-input::placeholder {
            color: #94a3b8;
          }

          .login-btn {
            width: 100%;
            padding: 0.875rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            margin-top: 0.5rem;
          }

          .login-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.6s ease;
          }

          .login-btn:hover::before {
            left: 100%;
          }

          .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          }

          .login-btn:active {
            transform: translateY(0);
          }

          .login-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
          }

          .login-error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            padding: 0.75rem 1rem;
            border-radius: 10px;
            font-size: 0.875rem;
            text-align: center;
            animation: shake 0.5s ease;
          }

          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
          }

          .login-footer {
            margin-top: 1.5rem;
            text-align: center;
            color: #94a3b8;
            font-size: 0.8rem;
            animation: fadeIn 0.6s ease 0.5s backwards;
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