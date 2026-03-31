import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';

const BASE = window.location.origin + window.location.pathname.replace(/\/?$/, '');
const STAFF_URL = `${BASE}/#/login`;

export default function StaffQR() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper p-6">
      <div className="w-full max-w-4xl border border-ink bg-white flex flex-col items-center p-12 sm:p-24 shadow-[8px_8px_0_0_#0a0a0a]">
        
        {/* Header */}
        <div className="mb-12 text-center w-full">
          <span className="badge badge-accent scale-150 origin-bottom mb-8 inline-block shadow-none">Staff Portal</span>
          <h1 className="text-5xl sm:text-8xl font-black uppercase tracking-tight text-ink leading-none">
            DAILY<br/>END-OF-DAY
          </h1>
          <div className="mt-8 h-2 w-32 bg-accent mx-auto" />
        </div>

        {/* Huge QR Code */}
        <div className="p-6 border-4 border-ink bg-white shadow-[8px_8px_0_0_#2596be] mb-12">
          <QRCodeSVG value={STAFF_URL} size={400} fgColor="#0a0a0a" bgColor="#ffffff" level="H" className="w-full max-w-[400px] h-auto aspect-square" />
        </div>

        <p className="font-mono text-xs sm:text-sm text-gray-500 uppercase tracking-[0.2em] mb-4 text-center">
          Scan to submit your daily operation report
        </p>

        
      </div>
    </div>
  );
}
