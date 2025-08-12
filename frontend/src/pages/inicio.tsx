export default function Inicio(){
  return (
    <div>
      <div style={{padding:'16px 18px', background:'linear-gradient(135deg,#0ea5e9,#22d3ee)', color:'#fff', borderRadius:12, boxShadow:'0 10px 30px rgba(14,165,233,.35)'}}>
        <div style={{fontSize:22, fontWeight:800, letterSpacing:.3}}>Refugio de Amor</div>
        <div style={{opacity:.95}}>Panel principal</div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px,1fr))', gap:12, marginTop:12}}>
        <a href="/ninos" className="card" style={{textDecoration:'none', color:'#0f172a'}}>
          <div style={{fontWeight:700, marginBottom:6}}>ninos</div>
          <div style={{color:'#64748b'}}>Gestiona altas, ediciones y busquedas</div>
        </a>
        <a href="/niveles" className="card" style={{textDecoration:'none', color:'#0f172a'}}>
          <div style={{fontWeight:700, marginBottom:6}}>niveles</div>
          <div style={{color:'#64748b'}}>Crea y organiza los niveles</div>
        </a>
        <a href="/subniveles" className="card" style={{textDecoration:'none', color:'#0f172a'}}>
          <div style={{fontWeight:700, marginBottom:6}}>subniveles</div>
          <div style={{color:'#64748b'}}>Define dias y horarios</div>
        </a>
        <a href="/admin/usuarios" className="card" style={{textDecoration:'none', color:'#0f172a'}}>
          <div style={{fontWeight:700, marginBottom:6}}>usuarios</div>
          <div style={{color:'#64748b'}}>Crea usuarios y asigna roles</div>
        </a>
      </div>
    </div>
  )
}
