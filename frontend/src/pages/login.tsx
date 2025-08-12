import { useState } from 'react'
import { api } from '../lib/api'

export default function Login({ onDone }:{ onDone:()=>void }){
  const [email,setEmail]=useState('directora@refugio.local')
  const [password,setPassword]=useState('demo123')
  const [err,setErr]=useState('')
  const [loading,setLoading]=useState(false)

  const go=async(e:any)=>{
    e.preventDefault(); setErr(''); setLoading(true)
    try{
      await api.login(email.trim(), password)
      onDone()
    }catch{
      setErr('Inicio de sesión invalido')
    }finally{
      setLoading(false)
    }
  }

  return (
    <div style={{display:'grid', placeItems:'center', minHeight:'100vh', background:'#f1f5f9'}}>
      <div className="card" style={{width:380}}>
        <div style={{textAlign:'center', marginBottom:8}}>
          <div style={{fontWeight:800, fontSize:20}}>Refugio de Amor</div>
          <div style={{color:'#64748b', fontSize:14}}>Ingresa tus datos para continuar</div>
        </div>
        <form onSubmit={go} className="form">
          <label>Correo</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="correo" />
          <label>Contraseña</label>
          <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="********" />
          {err && <div className="alert">{err}</div>}
          <button className="btn" type="submit" disabled={loading}>{loading?'Ingresando...':'Ingresar'}</button>
          <div style={{fontSize:12, color:'#64748b'}}>
            demo: directora@refugio.local, contabilidad@refugio.local, colaborador@refugio.local (clave: demo123)
          </div>
        </form>
      </div>
    </div>
  )
}
