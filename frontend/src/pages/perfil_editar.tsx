import { useEffect, useState } from 'react'; import { api } from '../lib/api'
export default function PerfilEditar(){ const [f,setF]=useState({nombres:'',apellidos:'',telefono:''}); useEffect(()=>{ api.perfil_get().then(d=> setF({nombres:d.nombres||'', apellidos:d.apellidos||'', telefono:d.telefono||''})) },[]);
const on=(e:any)=> setF({...f,[e.target.name]: e.target.value}); const save=async(e:any)=>{ e.preventDefault(); await api.perfil_update(f); location.href='/perfil' }
return <div><h1>editar perfil</h1><form onSubmit={save} className='form'>
<label>nombres</label><input className='input' name='nombres' value={f.nombres} onChange={on} required />
<label>apellidos</label><input className='input' name='apellidos' value={f.apellidos} onChange={on} required />
<label>telefono</label><input className='input' name='telefono' value={f.telefono} onChange={on} />
<button className='btn' type='submit'>guardar</button></form></div>}
