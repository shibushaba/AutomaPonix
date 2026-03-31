import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';

const BASE = window.location.origin + window.location.pathname.replace(/\/?$/, '');

export default function CustomerQR() {
  const [outlets, setOutlets] = useState([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');

  useEffect(() => {
    async function loadOutlets() {
      const { data } = await supabase.from('outlets').select('id, name').order('name');
      if (data) {
        setOutlets(data);
        if (data.length > 0) setSelectedOutlet(data[0].id);
      }
    }
    loadOutlets();
  }, []);

  const qrUrl = `${BASE}/#/customer${selectedOutlet ? `?outlet_id=${selectedOutlet}` : ''}`;

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

        {/* Outlet Selector */}
        {outlets.length > 0 && (
          <div className="mb-10 w-full max-w-xs flex flex-col items-center">
            <label className="block text-xs font-bold uppercase tracking-widest text-ink mb-2 text-center">Select Print Location</label>
            <select 
              className="w-full border-2 border-ink p-3 bg-paper font-mono focus:outline-none focus:border-primary shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-10 relative"
              value={selectedOutlet}
              onChange={(e) => setSelectedOutlet(e.target.value)}
            >
              {outlets.map(o => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
            <p className="font-mono text-[9px] text-gray-400 uppercase tracking-widest mt-4 text-center">
              * Select your outlet before printing.<br/>This links scans to your specific dashboard.
            </p>
          </div>
        )}

        {/* Huge QR Code */}
        <div className="p-6 border-4 border-ink bg-white shadow-[8px_8px_0_0_#e1492c] mb-12">
          <QRCodeSVG value={qrUrl} size={400} fgColor="#0a0a0a" bgColor="#ffffff" level="H" className="w-full max-w-[400px] h-auto aspect-square" />
        </div>

        <p className="font-mono text-xs sm:text-sm text-gray-500 uppercase tracking-[0.2em] mb-4 text-center">
          Point your phone camera here to leave feedback
        </p>
      </div>
    </div>
  );
}
