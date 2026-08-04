export const premiumEase=[.16,1,.3,1] as const;
export const appReveal={hidden:{opacity:0,y:12},visible:{opacity:1,y:0,transition:{duration:.55,ease:premiumEase,when:'beforeChildren',staggerChildren:.08}}};
export const navbarReveal={hidden:{opacity:0},visible:{opacity:1,transition:{duration:.38,ease:premiumEase}}};
export const heroItem={hidden:{opacity:0,y:24},visible:{opacity:1,y:0,transition:{duration:.68,ease:premiumEase}}};
