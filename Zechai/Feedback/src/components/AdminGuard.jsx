import { Navigate } from 'react-router-dom';

const ADMIN_KEY = 'revumate_admin_session';

export function loginAdmin() {
  localStorage.setItem(ADMIN_KEY, 'true');
}
export function logoutAdmin() {
  localStorage.removeItem(ADMIN_KEY);
}
export function isAdminLoggedIn() {
  return localStorage.getItem(ADMIN_KEY) === 'true';
}

export default function AdminGuard({ children }) {
  if (!isAdminLoggedIn()) {
    return <Navigate to="/admin-login" replace />;
  }
  return children;
}
