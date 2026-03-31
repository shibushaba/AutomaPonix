import { HashRouter, Routes, Route } from 'react-router-dom';
import Home             from './pages/Home';
import CustomerQR       from './pages/CustomerQR';
import StaffQR          from './pages/StaffQR';
import CustomerFeedback from './pages/CustomerFeedback';
import StaffReport      from './pages/StaffReport';
import AdminLogin       from './pages/AdminLogin';
import AdminPanel       from './pages/AdminPanel';
import AdminGuard       from './components/AdminGuard';
import Login            from './pages/Login';
import ManagerPanel     from './pages/ManagerPanel';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/"            element={<Home />} />
        <Route path="/qr-customer" element={<CustomerQR />} />
        <Route path="/qr-staff"    element={<StaffQR />} />
        <Route path="/customer"    element={<CustomerFeedback />} />
        <Route path="/staff"       element={<StaffReport />} />
        <Route path="/login"       element={<Login />} />
        <Route path="/manager"     element={<ManagerPanel />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin"       element={<AdminGuard><AdminPanel /></AdminGuard>} />
      </Routes>
    </HashRouter>
  );
}
