import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav bar */}
      <header className="border-b border-ink bg-white flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 bg-ink flex items-center justify-center">
            <span className="text-white font-black text-sm tracking-widest">Z</span>
          </div>
          <div>
            <p className="font-black text-sm tracking-[0.3em] uppercase text-ink">REVUMATE</p>
            <p className="font-mono text-[9px] tracking-widest text-gray-400 uppercase">Cafe · Est. 2024</p>
          </div>
        </div>
        <p className="font-mono text-[10px] tracking-widest text-gray-400 uppercase hidden sm:block">
          [ Hub Portal ]
        </p>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="mb-16 text-center">
          <p className="section-label mb-3">[ Display Manager ]</p>
          <h1 className="text-4xl sm:text-6xl font-black uppercase tracking-tight text-ink leading-none">
            SELECT<br/>DISPLAY
          </h1>
          <div className="mt-6 h-1 w-16 bg-ink mx-auto" />
        </div>

        {/* Directory Links */}
        <div className="w-full max-w-lg space-y-6">
          <Link
            to="/qr-customer"
            className="block border-2 border-ink bg-white p-6 sm:p-8 hover:bg-ink hover:text-white transition-colors duration-200 group shadow-[6px_6px_0_0_#e1492c] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="badge group-hover:bg-white group-hover:text-primary !border-primary text-primary transition-colors">Customer</span>
              <span className="font-mono text-xl">→</span>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight">Customer QR Display</h2>
            <p className="font-mono text-[11px] mt-2 opacity-60">Full-screen QR for tabletop or customer tablet</p>
          </Link>

          <Link
            to="/qr-staff"
            className="block border-2 border-ink bg-white p-6 sm:p-8 hover:bg-ink hover:text-white transition-colors duration-200 group shadow-[6px_6px_0_0_#2596be] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="badge group-hover:bg-white group-hover:text-accent !border-accent text-accent transition-colors">Staff</span>
              <span className="font-mono text-xl">→</span>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight">Staff QR Display</h2>
            <p className="font-mono text-[11px] mt-2 opacity-60">Full-screen QR for back-of-house or staff desk</p>
          </Link>

          <div className="grid grid-cols-2 gap-4 mt-12">
            <Link
              to="/login"
              className="block border-2 border-ink bg-white p-4 text-center hover:bg-ink hover:text-white transition-colors"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest font-bold">Manager / Staff Login</p>
            </Link>
            <Link
              to="/admin-login"
              className="block border-2 border-ink bg-white p-4 text-center hover:bg-ink hover:text-white transition-colors"
            >
              <p className="font-mono text-[10px] uppercase tracking-widest font-bold">HQ Master Override</p>
            </Link>
          </div>
        </div>
      </main>
      
      <footer className="border-t border-ink bg-white px-8 py-4 flex justify-between">
        <p className="font-mono text-[9px] text-gray-400 tracking-widest uppercase">© {new Date().getFullYear()} REVUMATE</p>
        <p className="font-mono text-[9px] text-gray-400 tracking-widest uppercase">All rights reserved</p>
      </footer>
    </div>
  );
}
