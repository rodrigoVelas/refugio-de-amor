import { useState } from 'react'; import { api } from '../lib/api'
export default function Login({ onDone }:{ onDone:()=>void }){
  const [email,setEmail]=useState('directora@refugio.local')
  const [password,setPassword]=useState('demo123')
  const [err,setErr]=useState('')
  const go=async(e:any)=>{ e.preventDefault(); setErr(''); try{ await api.login(email,password); onDone() }catch{ setErr('login invalido') } }
  return (<div className='content'>
    <h1>iniciar sesion</h1>
    <form onSubmit={go} className='form'>
      <label>email</label><input className='input' value={email} onChange={e=>setEmail(e.target.value)}/>
      <label>password</label><input className='input' type='password' value={password} onChange={e=>setPassword(e.target.value)}/>
      {err && <div className='alert'>{err}</div>}
      <button className='btn' type='submit'>entrar</button>
      <p>usuarios demo: directora@refugio.local, contabilidad@refugio.local, colaborador@refugio.local (clave: demo123)</p>
    </form>
  </div>)
}
