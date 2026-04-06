import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import toast, { Toaster } from 'react-hot-toast';

export default function SharedReport() {
  const { type, outletId, date, id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [outletName, setOutletName] = useState('HQ');

  useEffect(() => {
    async function fetchReport() {
      try {
        if (type === 'daily' && outletId && date) {
          // Fetch daily report
          const { data, error } = await supabase
            .from('saved_daily_reports')
            .select('*')
            .eq('outlet_id', outletId)
            .eq('report_date', date)
            .maybeSingle();
            
          if (error) throw error;
          
          if (data) {
            setReport(data);
            // Get outlet name
            const { data: outlet } = await supabase.from('outlets').select('name').eq('id', outletId).single();
            if (outlet) setOutletName(outlet.name);
          }
        } else if (type === 'master' && id) {
          // Fetch master report
          const { data, error } = await supabase
            .from('master_reports')
            .select('*')
            .eq('id', id)
            .single();
            
          if (error) throw error;
          if (data) {
            setReport(data);
            setOutletName('Global Network');
          }
        }
      } catch (err) {
        console.error('Error fetching shared report:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchReport();
  }, [type, outletId, date, id]);

  const handlePrint = () => {
    window.print();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-mono">
        <p className="animate-pulse tracking-widest uppercase">Decrypting Report...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper text-ink font-mono flex-col pb-20">
        <h1 className="text-4xl font-black mb-4">404</h1>
        <p className="uppercase tracking-widest text-sm text-gray-500">Report not found or has been deleted.</p>
      </div>
    );
  }

  const title = type === 'daily' 
    ? `${outletName} - Daily Report (${report.report_date})` 
    : `Master Report: ${report.report_type.toUpperCase()}`;

  const periodLabel = type === 'daily' 
    ? report.report_date 
    : `${report.period_start} to ${report.period_end}`;

  return (
    <div className="min-h-screen bg-paper text-ink font-mono print:bg-white print:text-black">
      <Toaster position="top-center" />
      
      {/* Top Banner (Hidden when Printing) */}
      <div className="no-print bg-ink text-white p-4 flex flex-wrap justify-between items-center gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary flex items-center justify-center font-black">R</div>
          <div>
            <h1 className="font-black text-sm tracking-widest uppercase leading-none">Shared Intel</h1>
            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-[0.2em]">{title}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={copyLink}
            className="border border-gray-600 bg-gray-800 hover:bg-gray-700 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors"
          >
            Copy Link
          </button>
          <button 
            onClick={handlePrint}
            className="bg-primary hover:bg-red-500 text-white border-2 border-transparent px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors"
          >
            Save PDF / Print
          </button>
        </div>
      </div>

      {/* Report Content - Formatted for Screen & Print */}
      <main className="max-w-4xl mx-auto p-4 sm:p-8 my-4 sm:my-8 bg-white border border-ink shadow-[8px_8px_0_0_#0a0a0a] print:border-none print:shadow-none print:p-0 print:my-0 print:max-w-none">
        
        {/* Print Only Header / Document Header */}
        <div className="border-b-2 border-ink pb-6 mb-6">
          <div className="flex justify-between items-end mb-2">
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter leading-none">
              {title}
            </h1>
            <div className="w-10 h-10 border-2 border-ink bg-ink text-white flex items-center justify-center font-black flex-shrink-0">
              R
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
             <p className="font-mono text-xs uppercase tracking-widest text-primary border border-primary px-3 py-1 inline-block font-bold">
               {type === 'daily' ? 'DAILY SITREP' : 'GLOBAL STRATEGY'}
             </p>
             <p className="font-mono text-xs text-gray-500 uppercase">
               Generated: {new Date(report.generated_at || report.created_at || Date.now()).toLocaleDateString()}
             </p>
          </div>
        </div>
        
        {/* Markdown Content */}
        <article className="prose prose-sm sm:prose-base font-mono max-w-none prose-headings:font-black prose-headings:uppercase prose-p:text-[11px] sm:prose-p:text-sm prose-a:text-primary print:prose-p:text-[11px] print:prose-p:leading-snug print:prose-headings:mt-4 print:prose-headings:mb-2 print:prose-ul:text-[11px]">
          <ReactMarkdown>{report.ai_content}</ReactMarkdown>
        </article>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-muted pb-4 flex justify-between items-center opacity-60">
          <p className="text-[9px] uppercase tracking-widest font-bold">Revumate Network Intelligence</p>
          <p className="text-[9px] uppercase tracking-widest">Period: {periodLabel}</p>
        </div>

      </main>
    </div>
  );
}
