import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginAdmin } from '../components/AdminGuard';

const ADMIN_USER = 'Zeechai';
const ADMIN_PASS = 'zee@chai';

export default function AdminLogin() {
  const [creds, setCreds]   = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (creds.username === ADMIN_USER && creds.password === ADMIN_PASS) {
        loginAdmin();
        navigate('/admin');
      } else {
        setError('Invalid credentials. Please try again.');
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 text-center">
          <div className="w-12 h-12 bg-ink flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-black text-lg tracking-widest">Z</span>
          </div>
          <p className="section-label mb-1">[ Admin Access ]</p>
          <h1 className="text-3xl font-black uppercase">REVUMATE<br/>ADMIN</h1>
        </div>

        <form onSubmit={handleSubmit} className="border border-ink bg-white p-6 space-y-4">
          <div>
            <label className="form-label">Username</label>
            <input
              type="text" required autoComplete="username"
              className="form-input"
              placeholder="Enter username"
              value={creds.username}
              onChange={(e) => setCreds((p) => ({ ...p, username: e.target.value }))}
            />
          </div>
          <div>
            <label className="form-label">Password</label>
            <input
              type="password" required autoComplete="current-password"
              className="form-input"
              placeholder="Enter password"
              value={creds.password}
              onChange={(e) => setCreds((p) => ({ ...p, password: e.target.value }))}
            />
          </div>

          {error && (
            <p className="font-mono text-[11px] text-primary border border-primary px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-ghost w-full py-3 mt-2">
            {loading ? 'Verifying...' : '→ Access Admin Panel'}
          </button>
        </form>

        <p className="font-mono text-[9px] text-gray-400 text-center mt-4 tracking-widest">
          RESTRICTED ACCESS · REVUMATE INTERNAL
        </p>
      </div>
    </div>
  );
}
