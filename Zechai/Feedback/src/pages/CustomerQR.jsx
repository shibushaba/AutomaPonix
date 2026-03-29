import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';

const BASE = window.location.origin + window.location.pathname.replace(/\/?$/, '');
const CUSTOMER_URL = `${BASE}/#/customer`;

export default function CustomerQR() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper p-6">
      <div className="w-full max-w-4xl border border-ink bg-white flex flex-col items-center p-12 sm:p-24 shadow-[8px_8px_0_0_#0a0a0a]">
        
        {/* Header */}
        <div className="mb-12 text-center w-full">
          <span className="badge badge-primary scale-150 origin-bottom mb-8 inline-block shadow-none">Customer Scan</span>
          <h1 className="text-5xl sm:text-8xl font-black uppercase tracking-tight text-ink leading-none">
            RATE YOUR<br/>EXPERIENCE
          </h1>
          <div className="mt-8 h-2 w-32 bg-primary mx-auto" />
        </div>

        {/* Huge QR Code */}
        <div className="p-6 border-4 border-ink bg-white shadow-[8px_8px_0_0_#e1492c] mb-12">
          <QRCodeSVG value={CUSTOMER_URL} size={400} fgColor="#0a0a0a" bgColor="#ffffff" level="H" className="w-full max-w-[400px] h-auto aspect-square" />
        </div>

        <p className="font-mono text-xs sm:text-sm text-gray-500 uppercase tracking-[0.2em] mb-4 text-center">
          Point your phone camera here to leave feedback
        </p>

        <Link to="/" className="btn-ghost text-xs mt-12 px-6 py-2 border-dashed">
          ← Back to Hub
        </Link>
      </div>
    </div>
  );
}
