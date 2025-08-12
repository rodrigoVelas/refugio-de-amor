import { ReactNode } from 'react'

export default function Modal({
  open, title, onClose, children, actions
}:{ open:boolean; title:string; onClose:()=>void; children:ReactNode; actions?:ReactNode }){
  if(!open) return null
  return (
    <div style={{position:'fixed', inset:0, display:'grid', placeItems:'center', background:'rgba(0,0,0,.35)', zIndex:1000}}>
      <div style={{background:'#fff', borderRadius:12, width:520, maxWidth:'92vw', boxShadow:'0 20px 60px rgba(0,0,0,.25)'}}>
        <div style={{padding:'12px 16px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <b>{title}</b>
          <button className="linklike" onClick={onClose}>cerrar</button>
        </div>
        <div style={{padding:16}}>{children}</div>
        {actions && <div style={{padding:12, borderTop:'1px solid #eee', display:'flex', gap:8, justifyContent:'flex-end'}}>{actions}</div>}
      </div>
    </div>
  )
}
