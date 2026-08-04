import {Navigate,RouterProvider,createBrowserRouter} from 'react-router-dom';
import {ProtectedRoute} from './components/ProtectedRoute';import {AppLayout} from './layouts/AppLayout';
import {CreateInvoicePage} from './pages/CreateInvoicePage';import {ForgotPassword} from './pages/ForgotPassword';import {LandingPage} from './pages/LandingPage';import {MerchantDashboard} from './pages/MerchantDashboard';import {MerchantInvoicePage} from './pages/MerchantInvoicePage';import {MerchantOnboarding} from './pages/MerchantOnboarding';import {MerchantSettings} from './pages/MerchantSettings';import {MerchantSignIn} from './pages/MerchantSignIn';import {MerchantSignUp} from './pages/MerchantSignUp';import {PayEntryPage} from './pages/PayEntryPage';import {PaymentPage} from './pages/PaymentPage';import {TransactionPage} from './pages/TransactionPage';
const router=createBrowserRouter([{element:<AppLayout/>,children:[
  {path:'/',element:<LandingPage/>},{path:'/pay',element:<PayEntryPage/>},{path:'/pay/:invoiceId',element:<PaymentPage/>},{path:'/transaction/:transactionId',element:<TransactionPage/>},
  {path:'/merchant/signup',element:<MerchantSignUp/>},{path:'/merchant/signin',element:<MerchantSignIn/>},{path:'/merchant/forgot-password',element:<ForgotPassword/>},
  {element:<ProtectedRoute requireMerchant={false}/>,children:[{path:'/merchant/onboarding',element:<MerchantOnboarding/>}]},
  {element:<ProtectedRoute/>,children:[{path:'/merchant',element:<MerchantDashboard/>},{path:'/merchant/create-invoice',element:<CreateInvoicePage/>},{path:'/merchant/invoice/:invoiceId',element:<MerchantInvoicePage/>},{path:'/merchant/settings',element:<MerchantSettings/>}]},
  {path:'*',element:<Navigate to="/" replace/>}
]}]);
export default function App(){return <RouterProvider router={router}/>}
