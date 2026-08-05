import {LogOut,Menu,Plus,WalletCards,X} from 'lucide-react';
import {motion} from 'motion/react';
import {useState} from 'react';
import {Link,NavLink,useNavigate} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';
import {BrandMark} from './brand/BrandMark';
import {navbarReveal} from './motion/variants';

export function Logo(){return <BrandMark mode="navbar"/>}

const publicLinks=[['/merchant/signin','For merchants']];
const merchantLinks=[['/merchant','Dashboard'],['/merchant/transactions','Transactions'],['/merchant/settings','Settings']];

export function AppHeader(){
  const {isAuthenticated,merchant,logout}=useAuth(),navigate=useNavigate(),[open,setOpen]=useState(false),[signingOut,setSigningOut]=useState(false);
  const links=isAuthenticated?merchantLinks:publicLinks;
  const signOut=async()=>{setSigningOut(true);try{await logout();setOpen(false);navigate('/',{replace:true})}finally{setSigningOut(false)}};
  return <motion.header variants={navbarReveal} initial="hidden" animate="visible" className="sticky top-0 z-40 border-b border-black/5 bg-[#f6f8f5]/90 backdrop-blur-xl">
    <div className="shell flex h-20 items-center justify-between">
      <div data-navbar-brand-target className="flex h-10 min-w-[124px] items-center"><Logo/></div>
      <motion.nav initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} transition={{delay:.18,duration:.45}} className="hidden items-center gap-6 md:flex">
        {links.map(([to,label])=><NavLink key={to} to={to} end={to==='/merchant'} className={({isActive})=>`text-sm font-bold ${isActive?'text-emerald':'text-[#506159] hover:text-forest'}`}>{label}</NavLink>)}
        {isAuthenticated?<>
          <a href="/pay" target="_blank" rel="noreferrer" className="text-sm font-bold text-[#506159] hover:text-forest">View customer payment page</a>
          <Link to="/merchant/create-invoice" className="btn-primary !px-4 !py-2.5"><Plus size={17}/>Create invoice</Link>
          <Link to="/merchant/settings" aria-label="Merchant settings" className="flex items-center gap-2 rounded-full border border-black/[.07] bg-white py-1.5 pl-1.5 pr-3 shadow-sm"><span className="grid h-8 w-8 place-items-center rounded-full bg-forest text-xs font-extrabold text-white">{(merchant?.businessName||'M').slice(0,1).toUpperCase()}</span><span className="max-w-28 truncate text-sm font-bold text-forest">{merchant?.businessName||'Merchant'}</span></Link>
        </>:<Link to="/pay" className="btn-primary !px-4 !py-2.5"><WalletCards size={17}/>Make payment</Link>}
      </motion.nav>
      <button aria-label="Toggle menu" className="md:hidden" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button>
    </div>
    {open&&<nav className="shell flex flex-col gap-2 border-t border-black/5 py-4 md:hidden">
      {isAuthenticated&&<div className="mb-2 flex items-center gap-3 rounded-2xl bg-white p-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-forest font-extrabold text-white">{(merchant?.businessName||'M').slice(0,1).toUpperCase()}</span><div className="min-w-0"><p className="truncate font-extrabold">{merchant?.businessName||'Merchant account'}</p><p className="text-xs text-[#718078]">Merchant workspace</p></div></div>}
      {links.map(([to,label])=><Link key={to} to={to} onClick={()=>setOpen(false)} className="rounded-xl px-3 py-2.5 font-bold hover:bg-white">{label}</Link>)}
      {isAuthenticated&&<><a href="/pay" target="_blank" rel="noreferrer" onClick={()=>setOpen(false)} className="rounded-xl px-3 py-2.5 font-bold text-[#596a61]">View customer payment page</a><Link to="/merchant/create-invoice" onClick={()=>setOpen(false)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 font-bold text-emerald"><Plus size={17}/>Create invoice</Link><button type="button" disabled={signingOut} onClick={signOut} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left font-bold text-red-600 hover:bg-red-50"><LogOut size={17}/>{signingOut?'Signing out…':'Sign out'}</button></>}
    </nav>}
  </motion.header>
}
