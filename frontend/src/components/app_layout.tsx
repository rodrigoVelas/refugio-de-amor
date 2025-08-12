import Header from './header'
import Sidebar from './sidebar'
export default function AppLayout({ user, children }:{ user:any, children:any }){
  return (<>
    <Header user={user} />
    <div className='app'>
      <Sidebar user={user} />
      <main className='content'>{children}</main>
    </div>
  </>)
}
