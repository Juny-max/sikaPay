import {motion} from 'motion/react';
import {useCallback,useState} from 'react';
import {Outlet,useLocation} from 'react-router-dom';
import {AppHeader} from '../components/AppHeader';
import {MobileNavigation} from '../components/MobileNavigation';
import {SplashScreen} from '../components/SplashScreen';
import {appReveal} from '../components/motion/variants';

const introWasSeen=()=>{try{return sessionStorage.getItem('sikapay_intro_seen')==='true'}catch{return false}};
const isMerchantWorkspace=(pathname:string)=>pathname==='/merchant'||pathname.startsWith('/merchant/create-invoice')||pathname.startsWith('/merchant/invoice/')||pathname.startsWith('/merchant/transactions')||pathname.startsWith('/merchant/settings');

export function AppLayout(){const {pathname}=useLocation(),workspace=isMerchantWorkspace(pathname),[introEnabled,setIntroEnabled]=useState(()=>!introWasSeen()),[revealed,setRevealed]=useState(()=>introWasSeen());const reveal=useCallback(()=>setRevealed(true),[]),docked=useCallback(()=>{try{sessionStorage.setItem('sikapay_intro_seen','true')}catch{/* unavailable */}setIntroEnabled(false)},[]);if(workspace)return <main className="min-h-screen"><Outlet/></main>;return <><motion.div variants={appReveal} initial={false} animate={revealed?'visible':'hidden'} style={{visibility:revealed?'visible':'hidden'}}><AppHeader/><main className="min-h-[calc(100vh-5rem)] pb-24 md:pb-0"><Outlet/></main><MobileNavigation/></motion.div>{introEnabled&&<SplashScreen onReveal={reveal} onDocked={docked}/>}</>}
