import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';

export default function DailyReportViewer({ manager, today }) {
  const [data, setData] = useState(null);
  const [aiReport, setAiReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, [today]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [{ data: customers }, { data: staffRpts }, { data: savedReport }] = await Promise.all([
        supabase.from('customer_feedback')
          .select('*')
          .or(`outlet_id.eq.${manager.outlet_id},outlet_id.is.null`)
          .gte('created_at', `${today}T00:00:00`),
        supabase.from('staff_reports')
          .select('*')
          .or(`outlet_id.eq.${manager.outlet_id},outlet_id.is.null`)
          .gte('created_at', `${today}T00:00:00`),
        supabase.from('saved_daily_reports')
          .select('*')
          .eq('outlet_id', manager.outlet_id)
          .eq('report_date', today)
          .maybeSingle()
      ]);

      const cust = customers || [];
      const staff = staffRpts || [];

      // Stats
      const avgRating = cust.length
        ? (cust.reduce((a, c) => a + c.stars, 0) / cust.length).toFixed(1)
        : null;

      const starDist = [5, 4, 3, 2, 1].map(s => ({
        stars: s,
        count: cust.filter(c => c.stars === s).length,
        pct: cust.length ? Math.round((cust.filter(c => c.stars === s).length / cust.length) * 100) : 0
      }));

      // Items
      const itemMap = {};
      cust.forEach(c => {
        if (!c.item_ordered) return;
        const k = c.item_ordered.trim();
        itemMap[k] = (itemMap[k] || 0) + 1;
      });
      const topItems = Object.entries(itemMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

      // Staff reports
      const staffReports = staff.filter(s => !s.is_manager_report);
      const managerReport = staff.find(s => s.is_manager_report);

      // Customers with feedback
      const feedbacks = cust.filter(c => c.feedback_msg);
      const complaints = staffReports.filter(s => s.complaints && s.complaints !== 'None' && s.complaints.trim());

      setData({ cust, staffReports, managerReport, avgRating, starDist, topItems, feedbacks, complaints });
      if (savedReport) setAiReport(savedReport);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  if (loading) return (
    <div className="flex items-center gap-3 py-8 font-mono text-xs text-gray-400 animate-pulse">
      <span className="w-2 h-2 bg-accent rounded-full animate-bounce"></span>
      Compiling report data...
    </div>
  );

  if (!data) return null;

  const { cust, staffReports, managerReport, avgRating, starDist, topItems, feedbacks, complaints } = data;

  return (
    <div className="space-y-6">

      {/* ── TOP STAT CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Customers', value: cust.length, color: 'border-ink' },
          { label: 'Avg Rating', value: avgRating ? `${avgRating}★` : 'N/A', color: 'border-primary', textColor: 'text-primary' },
          { label: 'Staff Reports', value: staffReports.length, color: 'border-accent' },
          { label: 'Complaints', value: complaints.length, color: 'border-red-500', textColor: complaints.length > 0 ? 'text-red-600' : '' },
        ].map(s => (
          <div key={s.label} className={`border-2 ${s.color} bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
            <p className="text-[8px] text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`font-black text-2xl ${s.textColor || 'text-ink'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── TWO COLUMN: STAR DIST + TOP ITEMS ── */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Star Distribution */}
        <div className="border-2 border-ink bg-white p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <p className="section-label mb-4">[ Rating Breakdown ]</p>
          <div className="space-y-2">
            {starDist.map(s => (
              <div key={s.stars} className="flex items-center gap-3 text-xs font-mono">
                <span className="w-6 font-bold text-right shrink-0">{s.stars}★</span>
                <div className="flex-1 bg-gray-100 border border-muted h-5 relative">
                  <div
                    className={`h-full transition-all ${s.stars >= 4 ? 'bg-green-500' : s.stars === 3 ? 'bg-yellow-400' : 'bg-red-400'}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <span className="w-12 text-right shrink-0 text-gray-500">{s.count} ({s.pct}%)</span>
              </div>
            ))}
          </div>
          {cust.length === 0 && <p className="font-mono text-xs text-gray-400 text-center py-4">No customer data</p>}
        </div>

        {/* Top Items */}
        <div className="border-2 border-ink bg-white p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <p className="section-label mb-4">[ Top Items Ordered ]</p>
          {topItems.length === 0 ? (
            <p className="font-mono text-xs text-gray-400 text-center py-4">No order data</p>
          ) : (
            <div className="space-y-2">
              {topItems.map(([item, count], i) => (
                <div key={item} className="flex items-center gap-3">
                  <span className={`w-6 h-6 flex items-center justify-center font-black text-xs ${i === 0 ? 'bg-primary text-white' : 'bg-paper border border-ink text-ink'}`}>
                    {i + 1}
                  </span>
                  <span className="flex-1 font-mono text-xs capitalize font-bold">{item}</span>
                  <span className="font-black text-sm text-accent">{count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CUSTOMER FEEDBACK SAMPLES ── */}
      {feedbacks.length > 0 && (
        <div className="border-2 border-ink bg-white p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <p className="section-label mb-4">[ Customer Voices ]</p>
          <div className="space-y-3">
            {feedbacks.slice(0, 6).map((c, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span className={`font-black text-base shrink-0 ${c.stars >= 4 ? 'text-green-500' : c.stars === 3 ? 'text-yellow-500' : 'text-red-500'}`}>{c.stars}★</span>
                <div>
                  <p className="font-mono text-[11px] text-ink">"{c.feedback_msg}"</p>
                  {c.item_ordered && <p className="font-mono text-[9px] text-gray-400 mt-0.5">{c.name || 'Anonymous'} · {c.item_ordered}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── STAFF REPORTS ── */}
      {staffReports.length > 0 && (
        <div className="border-2 border-ink bg-white p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <p className="section-label mb-4">[ Staff End-of-Day Reports ]</p>
          <div className="space-y-4">
            {staffReports.map((s, i) => (
              <div key={i} className={`border-l-4 pl-4 py-2 ${s.day_stars >= 4 ? 'border-green-500' : s.day_stars === 3 ? 'border-yellow-400' : 'border-red-400'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-black text-sm uppercase">{s.name}</span>
                  <span className={`font-black text-lg ${s.day_stars >= 4 ? 'text-green-600' : s.day_stars === 3 ? 'text-yellow-500' : 'text-red-500'}`}>{s.day_stars}/5</span>
                </div>
                <p className="font-mono text-[11px] text-gray-600">{s.feedback}</p>
                {s.complaints && s.complaints !== 'None' && s.complaints.trim() && (
                  <p className="font-mono text-[10px] text-red-700 mt-1 bg-red-50 px-2 py-1 border-l-2 border-red-400">
                    ⚠ {s.complaints}
                  </p>
                )}
                {s.suggestions && s.suggestions !== 'None' && s.suggestions.trim() && (
                  <p className="font-mono text-[10px] text-gray-500 mt-1">💡 {s.suggestions}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MANAGER REPORT ── */}
      {managerReport && (
        <div className="border-2 border-accent bg-white p-5 shadow-[3px_3px_0px_0px_rgba(33,186,177,1)]">
          <p className="section-label !text-accent mb-4">[ Manager's Report ]</p>
          <div className="flex items-center gap-3 mb-3">
            <p className="font-black text-2xl text-accent">{managerReport.day_stars}/5</p>
            <p className="font-mono text-xs text-gray-500">Day Rating</p>
          </div>
          <div className="space-y-2 font-mono text-[11px]">
            <p><span className="font-bold uppercase text-gray-400">Summary:</span> {managerReport.feedback}</p>
            {managerReport.complaints && managerReport.complaints !== 'None' && (
              <p className="text-red-700"><span className="font-bold">Issues:</span> {managerReport.complaints}</p>
            )}
            {managerReport.suggestions && (
              <p><span className="font-bold">Tomorrow:</span> {managerReport.suggestions}</p>
            )}
          </div>
        </div>
      )}

      {/* ── AI NARRATIVE ── */}
      {aiReport && (
        <div className="border-2 border-ink bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <p className="section-label mb-4 border-l-4 border-primary pl-3">[ AI Executive Narrative ]</p>
          <div className="prose prose-sm font-mono max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-widest prose-h2:text-sm prose-h3:text-xs prose-p:text-[11px] prose-p:leading-relaxed prose-strong:text-primary prose-li:text-[11px]">
            <ReactMarkdown>{aiReport.ai_content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
