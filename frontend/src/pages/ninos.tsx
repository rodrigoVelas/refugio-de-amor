import { useEffect, useState } from 'react'; import { api } from '../lib/api'
export default function Ninos(){
  const [rows,setRows]=useState<any[]>([]); const [niveles,setNiveles]=useState<any[]>([]); const [subs,setSubs]=useState<any[]>([]); const [q,setQ]=useState('')
  const [f,setF]=useState({nombres:'',apellidos:'',fecha_nacimiento:'',nivel_id:'',subnivel_id:'',maestro_id:''})
  const load=()=> api.ninos_list(q).then(setRows); useEffect(()=>{ load() },[q])
  useEffect(()=>{ api.niveles_list().then(setNiveles); api.subniveles_list().then(setSubs) },[])
  return <div>
    <h1>ninos</h1>
    <div className='flex'>
      <input className='input' placeholder='buscar por nombre' value={q} onChange={e=>setQ(e.target.value)} />
      <button className='btn' onClick={()=>load()}>buscar</button>
    </div>
    <form className='form' onSubmit={async(e)=>{e.preventDefault(); await api.ninos_create(f); setF({nombres:'',apellidos:'',fecha_nacimiento:'',nivel_id:'',subnivel_id:'',maestro_id:''}); load()}}>
      <input className='input' placeholder='nombres' value={f.nombres} onChange={e=>setF({...f,nombres:e.target.value})} required />
      <input className='input' placeholder='apellidos' value={f.apellidos} onChange={e=>setF({...f,apellidos:e.target.value})} required />
      <input className='input' type='date' value={f.fecha_nacimiento} onChange={e=>setF({...f,fecha_nacimiento:e.target.value})} required />
      <select className='input' value={f.nivel_id} onChange={e=>setF({...f,nivel_id:e.target.value})}><option value=''>nivel</option>{niveles.map((n:any)=><option key={n.id} value={n.id}>{n.nombre}</option>)}</select>
      <select className='input' value={f.subnivel_id} onChange={e=>setF({...f,subnivel_id:e.target.value})}><option value=''>subnivel</option>{subs.map((s:any)=><option key={s.id} value={s.id}>{s.nombre}</option>)}</select>
      <input className='input' placeholder='maestro_id (uuid)' value={f.maestro_id} onChange={e=>setF({...f,maestro_id:e.target.value})} />
      <button className='btn'>crear</button>
    </form>
    <table className='table' style={{marginTop:12}}><thead><tr><th>nombres</th><th>apellidos</th><th>nivel</th><th>subnivel</th><th>acciones</th></tr></thead><tbody>
      {rows.map((r:any)=>(<tr key={r.id}><td>{r.nombres}</td><td>{r.apellidos}</td><td>{r.nivel||'-'}</td><td>{r.subnivel||'-'}</td>
      <td><button className='btn' onClick={async()=>{ const nombres=prompt('nombres', r.nombres)||r.nombres; await api.ninos_update(r.id,{nombres}); load() }}>editar</button>
      {' '}<button className='btn' onClick={async()=>{ if(confirm('eliminar?')){ await api.ninos_delete(r.id); load() } }}>eliminar</button></td></tr>))}
    </tbody></table>
  </div>
}
