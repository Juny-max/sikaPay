import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { RequireMerchant } from './components/RequireMerchant';
import { AppLayout } from './layouts/AppLayout';
import { CreateInvoicePage } from './pages/CreateInvoicePage';
import { LandingPage } from './pages/LandingPage';
import { MerchantDashboard } from './pages/MerchantDashboard';
import { MerchantInvoicePage } from './pages/MerchantInvoicePage';
import { MerchantLoginPage } from './pages/MerchantLoginPage';
import { MerchantSetupPage } from './pages/MerchantSetupPage';
import { PayEntryPage } from './pages/PayEntryPage';
import { PaymentPage } from './pages/PaymentPage';
import { TransactionPage } from './pages/TransactionPage';

const protectedPage = (page: ReactNode) => <RequireMerchant>{page}</RequireMerchant>;
const router = createBrowserRouter([{ element: <AppLayout />, children: [
  { path: '/', element: <LandingPage /> }, { path: '/pay', element: <PayEntryPage /> },
  { path: '/pay/:invoiceId', element: <PaymentPage /> },
  { path: '/merchant/login', element: <MerchantLoginPage /> }, { path: '/merchant/setup', element: <MerchantSetupPage /> },
  { path: '/merchant', element: protectedPage(<MerchantDashboard />) },
  { path: '/merchant/create-invoice', element: protectedPage(<CreateInvoicePage />) },
  { path: '/merchant/invoice/:invoiceId', element: protectedPage(<MerchantInvoicePage />) },
  { path: '/transaction/:transactionId', element: <TransactionPage /> }, { path: '*', element: <Navigate to="/" replace /> }
] }]);
export default function App() { return <RouterProvider router={router} />; }
