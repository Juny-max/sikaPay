import {FilePlus2,Home,LayoutDashboard,ReceiptText,ScanLine} from 'lucide-react';
import {NavLink} from 'react-router-dom';
import {useAuth} from '../hooks/useAuth';

export function MobileNavigation(){const {isAuthenticated}=useAuth();const items=isAuthenticated?[[LayoutDashboard,'/merchant','Dashboard'],[FilePlus2,'/merchant/create-invoice','Invoice'],[ReceiptText,'/merchant/transactions','Transactions']]:[[Home,'/','Home'],[ScanLine,'/pay','Pay'],[LayoutDashboard,'/merchant','Merchant']];return <nav className="fixed bottom-3 left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-full border border-white/60 bg-forest/95 p-1.5 text-white shadow-2xl backdrop-blur md:hidden">{items.map(([Icon,to,label])=><NavLink key={String(to)} to={String(to)} end={to==='/merchant'} aria-label={String(label)} className={({isActive})=>`grid h-12 w-16 place-items-center rounded-full ${isActive?'bg-white text-forest':'text-white/70'}`}><Icon size={20}/></NavLink>)}</nav>}
