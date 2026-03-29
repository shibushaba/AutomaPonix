import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { logoutAdmin } from '../components/AdminGuard';
import StarRating from '../components/StarRating';
import toast, { Toaster } from 'react-hot-toast';

const TABS = ['Customers', 'Staff', 'Daily Report'];

export default function AdminPanel() {
  const [tab, setTab] = useState(0);
  const navigate = useNavigate();

  const handleLogout = () => { logoutAdmin(); navigate('/admin-login'); };

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-center" />

      {/* Top bar */}
      <header className="border-b border-ink bg-white flex items-center justify-between px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-ink flex items-center justify-center">
            <span className="text-white font-black text-xs">Z</span>
          </div>
          <div>
            <p className="font-black text-xs tracking-[0.3em] uppercase">ZECHAI</p>
            <p className="font-mono text-[9px] tracking-widest text-gray-400 uppercase">Admin Panel</p>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-sm border-ink text-ink hover:bg-ink hover:text-white">
          Logout
        </button>
      </header>

      {/* Tab bar */}
      <div className="border-b border-ink bg-white flex overflow-x-auto whitespace-nowrap">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`font-mono text-[11px] tracking-widest uppercase px-6 py-3 border-r border-ink transition-colors flex-shrink-0
              ${tab === i ? 'bg-ink text-white' : 'bg-white text-gray-500 hover:bg-paper'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <main className="flex-1 px-4 sm:px-8 py-8">
        {tab === 0 && <CustomerTab />}
        {tab === 1 && <StaffTab />}
        {tab === 2 && <DailyReportTab />}
      </main>
    </div>
  );
}

/* ─── Customer Tab ─────────────────────────────────────────── */
function CustomerTab() {
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [starFilter, setStarFilter] = useState(0);
  const [search, setSearch]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('customer_feedback').select('*').order('created_at', { ascending: false });
    if (starFilter > 0) q = q.eq('stars', starFilter);
    const { data } = await q;
    setLoading(false);
    if (data) setRows(data);
  }, [starFilter]);

  useEffect(() => { load(); }, [load]);

  // Find returning customers (same phone, multiple entries)
  const phoneCount = {};
  rows.forEach((r) => { if (r.phone) phoneCount[r.phone] = (phoneCount[r.phone] || 0) + 1; });

  const filtered = rows.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.name || '').toLowerCase().includes(s) || (r.phone || '').includes(s) || (r.item_ordered || '').toLowerCase().includes(s);
  });

  const deleteCustomer = async (id) => {
    if (!window.confirm('Delete this feedback entry permanently?')) return;
    toast.loading('Deleting...', { id: 'del-cust' });
    const { error } = await supabase.from('customer_feedback').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete', { id: 'del-cust' });
    } else {
      toast.success('Deleted successfully', { id: 'del-cust' });
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const totalReturning = Object.values(phoneCount).filter((v) => v > 1).length;
  const avgStars = rows.length ? (rows.reduce((a, r) => a + r.stars, 0) / rows.length).toFixed(1) : '—';

  return (
    <div>
      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border border-ink bg-white mb-6">
        <Stat label="Total Feedback" value={rows.length} />
        <Stat label="Avg Rating" value={`${avgStars} ★`} />
        <Stat label="Returning Customers" value={totalReturning} accent />
        <Stat label="Today" value={rows.filter((r) => r.created_at?.startsWith(new Date().toISOString().slice(0, 10))).length} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input className="form-input max-w-xs text-xs" placeholder="Search name, phone, item..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4, 5].map((s) => (
            <button key={s} onClick={() => setStarFilter(s)}
              className={`btn btn-sm ${starFilter === s ? 'bg-ink text-white border-ink' : 'border-ink'}`}>
              {s === 0 ? 'All' : `${s}★`}
            </button>
          ))}
        </div>
        <button onClick={load} className="btn btn-sm border-accent text-accent hover:bg-accent hover:text-white">↻ Refresh</button>
      </div>

      {/* Table */}
      {loading ? <LoadingRow /> : (
        <div className="overflow-x-auto border border-ink bg-white">
          <table className="w-full data-table">
            <thead>
              <tr>
                <th>Date</th><th>Name</th><th>Phone</th><th>Item(s)</th><th>Rating</th><th>Feedback</th><th>Suggestion</th><th>Type</th><th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">No records found.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="font-semibold">{r.name || '—'}</td>
                  <td className="whitespace-nowrap">{r.phone || '—'}</td>
                  <td>{r.item_ordered || '—'}</td>
                  <td className="whitespace-nowrap"><StarRating value={r.stars} readonly /></td>
                  <td className="max-w-[200px] truncate" title={r.feedback_msg}>{r.feedback_msg || '—'}</td>
                  <td className="max-w-[150px] truncate" title={r.suggestion}>{r.suggestion || '—'}</td>
                  <td>
                    {r.phone && phoneCount[r.phone] > 1
                      ? <span className="badge badge-primary">Returning</span>
                      : <span className="badge badge-accent">New</span>}
                  </td>
                  <td className="text-right">
                    <button onClick={() => deleteCustomer(r.id)} className="text-gray-400 hover:text-primary text-lg" title="Delete">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Staff Tab ─────────────────────────────────────────────── */
function StaffTab() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [markInput, setMarkInput] = useState(10);
  const [markNote, setMarkNote]   = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [achievements, setAchievements] = useState([]);
  const [marks, setMarks]         = useState([]);
  const [todayMark, setTodayMark] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('staff_reports').select('*').order('created_at', { ascending: false });
    if (dateFilter) q = q.gte('created_at', dateFilter + 'T00:00:00').lte('created_at', dateFilter + 'T23:59:59');
    const { data } = await q;
    setLoading(false);
    if (data) setRows(data);
  }, [dateFilter]);

  useEffect(() => { load(); }, [load]);

  // Build unique staff list
  const staffMap = {};
  rows.forEach((r) => {
    const key = r.phone || r.name;
    if (!staffMap[key]) staffMap[key] = { name: r.name, phone: r.phone, reports: [] };
    staffMap[key].reports.push(r);
  });
  const staffList = Object.values(staffMap);

  const loadAchievements = async (phone) => {
    const { data } = await supabase.from('staff_achievements').select('*').eq('staff_phone', phone || '').order('awarded_at', { ascending: false });
    setAchievements(data || []);
  };

  const openProfile = async (staff) => {
    setSelected(staff);
    setMarkInput(10);
    setMarkNote('');
    loadAchievements(staff.phone);
    
    // Fetch their marks
    const { data: mData } = await supabase.from('staff_marks')
        .select('*')
        .or(`staff_phone.eq.${staff.phone},staff_name.eq.${staff.name}`)
        .order('date', { ascending: false });
    
    const localDateStr = new Date().toISOString().slice(0, 10);
    const tm = mData?.find(m => m.date === localDateStr);
    
    setMarks(mData || []);
    setTodayMark(tm || null);
  };

  const assignMark = async (staff, m) => {
    toast.loading('Saving mark...', { id: 'mark' });
    const { data, error } = await supabase.from('staff_marks').insert([{
      staff_name: staff.name, staff_phone: staff.phone, mark: m, admin_note: markNote,
    }]).select();
    if (!error) {
      toast.success('Mark assigned!', { id: 'mark' });
      setMarkInput(10);
      setMarkNote('');
      if (data && data[0]) {
        setMarks([data[0], ...marks]);
        setTodayMark(data[0]);
      }
    } else toast.error('Failed to assign mark', { id: 'mark' });
  };

  const awardBestStaff = async (staff) => {
    const now = new Date();
    const { error } = await supabase.from('staff_achievements').insert([{
      staff_name: staff.name, staff_phone: staff.phone,
      month: now.getMonth() + 1, year: now.getFullYear(), title: 'Best Staff of the Month',
    }]);
    if (error) toast.error('Failed to award.'); else { toast.success(`🏆 Awarded to ${staff.name}!`); loadAchievements(staff.phone); }
  };

  const avgStars = (reports) => {
    if (!reports.length) return 0;
    return (reports.reduce((a, r) => a + r.day_stars, 0) / reports.length).toFixed(1);
  };

  const deleteStaffReport = async (id) => {
    if (!window.confirm('Delete this specific daily report?')) return;
    toast.loading('Deleting report...', { id: 'del-rep' });
    const { error } = await supabase.from('staff_reports').delete().eq('id', id);
    if (!error) {
      toast.success('Report deleted', { id: 'del-rep' });
      setSelected(prev => ({ ...prev, reports: prev.reports.filter(r => r.id !== id) }));
      load();
    } else toast.error('Failed to delete', { id: 'del-rep' });
  };

  const wipeStaff = async (staff) => {
    const code = prompt(`Type "DELETE" to permanently wipe all data for ${staff.name}`);
    if (code !== 'DELETE') return toast.error('Wipe cancelled.');
    toast.loading('Wiping staff history...', { id: 'wipe' });
    await Promise.all([
      supabase.from('staff_reports').delete().or(`phone.eq.${staff.phone},name.eq.${staff.name}`),
      supabase.from('staff_marks').delete().or(`staff_phone.eq.${staff.phone},staff_name.eq.${staff.name}`),
      supabase.from('staff_achievements').delete().or(`staff_phone.eq.${staff.phone},staff_name.eq.${staff.name}`)
    ]);
    toast.success('Staff wiped completely.', { id: 'wipe' });
    setSelected(null);
    load();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Staff list */}
      <div className="flex-1">
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <input type="date" className="form-input max-w-xs text-xs" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          <button onClick={() => setDateFilter('')} className="btn btn-sm border-ink">Clear</button>
          <button onClick={load} className="btn btn-sm border-accent text-accent hover:bg-accent hover:text-white">↻ Refresh</button>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 border border-ink bg-white mb-4">
          <Stat label="Total Staff" value={staffList.length} />
          <Stat label="Reports Today" value={rows.filter((r) => r.created_at?.startsWith(new Date().toISOString().slice(0, 10))).length} />
          <Stat label="Total Reports" value={rows.length} />
        </div>

        {loading ? <LoadingRow /> : (
          <div className="overflow-x-auto border border-ink bg-white">
            <table className="w-full data-table">
              <thead><tr><th>Name</th><th>Phone</th><th>Reports</th><th>Avg Day ★</th><th>Latest</th><th>Action</th></tr></thead>
              <tbody>
                {staffList.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No staff reports yet.</td></tr>
                ) : staffList.map((s, i) => (
                  <tr key={i}>
                    <td className="font-semibold">{s.name}</td>
                    <td>{s.phone || '—'}</td>
                    <td>{s.reports.length}</td>
                    <td>{avgStars(s.reports)} ★</td>
                    <td>{fmtDate(s.reports[0]?.created_at)}</td>
                    <td>
                      <button onClick={() => openProfile(s)} className="btn btn-sm border-accent text-accent hover:bg-accent hover:text-white">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff profile side panel */}
      {selected && (
        <div className="w-full lg:w-80 flex-shrink-0 border border-ink bg-white p-5 space-y-5 sticky top-24 self-start max-h-[80vh] overflow-y-auto shadow-[4px_4px_0_0_#0a0a0a]">
          <div className="flex items-center justify-between">
            <p className="font-black text-sm uppercase">{selected.name}</p>
            <button onClick={() => setSelected(null)} className="font-mono text-[10px] text-gray-400 hover:text-ink">✕ Close</button>
          </div>
          <p className="font-mono text-[10px] text-gray-400">{selected.phone} · {selected.reports.length} reports</p>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div>
              <p className="form-label mb-2">Achievements</p>
              <div className="flex flex-wrap gap-1">
                {achievements.map((a, i) => (
                  <span key={i} className="badge badge-ink text-[9px]">🏆 {a.title} {a.month}/{a.year}</span>
                ))}
              </div>
            </div>
          )}

          {/* Assign mark */}
          <div className="border-t border-ink pt-4">
            <p className="form-label mb-2">Assign Today's Mark (0-10)</p>
            {todayMark ? (
              <div className="border border-green-600 bg-green-50 p-4 mb-4">
                <p className="font-mono text-[11px] text-green-700 font-bold uppercase">✓ Mark Saved Today</p>
                <p className="font-black text-2xl text-green-800">{todayMark.mark}<span className="text-sm opacity-50">/10</span></p>
                {todayMark.admin_note && <p className="font-mono text-[10px] text-green-700 mt-2 px-2 py-1 bg-white border border-green-200">Note: {todayMark.admin_note}</p>}
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                <div className="flex gap-2">
                  <input type="number" min="0" max="10" className="form-input flex-1 text-center font-black text-xl" value={markInput} onChange={(e) => setMarkInput(Number(e.target.value))} />
                  <button onClick={() => assignMark(selected, markInput)} className="btn bg-white">Save</button>
                </div>
                <input type="text" placeholder="Admin note (optional)" className="form-input text-xs" value={markNote} onChange={(e) => setMarkNote(e.target.value)} />
              </div>
            )}
          </div>

          {/* Best Staff Award */}
          <button onClick={() => awardBestStaff(selected)} className="btn w-full border-primary text-primary hover:bg-primary hover:text-white">
            🏆 Award Best Staff of Month
          </button>

          {/* Recent reports */}
          <div className="border-t border-ink pt-4">
            <p className="form-label mb-2">Recent Reports</p>
            <div className="space-y-3">
              {selected.reports.map((r, i) => (
                <div key={i} className="border border-muted p-3 relative group">
                  <button onClick={() => deleteStaffReport(r.id)} className="absolute top-2 right-2 text-gray-300 hover:text-primary transition-opacity" title="Delete Report">🗑️</button>
                  <div className="flex justify-between items-center mb-1 pr-6">
                    <p className="font-mono text-[9px] text-gray-400">{fmtDate(r.created_at)}</p>
                    <StarRating value={r.day_stars} readonly />
                  </div>
                  {r.feedback && <p className="font-mono text-[10px] text-gray-600 truncate">"{r.feedback}"</p>}
                  {r.complaints && <p className="font-mono text-[10px] text-primary truncate">⚠ {r.complaints}</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Past Marks */}
          {marks.length > 0 && (
            <div className="border-t border-ink pt-4 mt-6">
              <p className="form-label mb-2">Recent Marks</p>
              <div className="space-y-2">
                {marks.slice(0, 5).map((m, i) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 border border-ink px-3 py-2">
                    <div>
                      <p className="font-mono text-[10px] text-ink">{m.date}</p>
                      {m.admin_note && <p className="font-mono text-[9px] text-gray-500 truncate max-w-[150px]">Note: {m.admin_note}</p>}
                    </div>
                    <span className="font-black text-sm">{m.mark}/10</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-ink pt-4 mt-6">
            <button onClick={() => wipeStaff(selected)} className="w-full font-mono text-[10px] uppercase text-primary border border-primary border-dashed p-3 hover:bg-primary hover:text-white transition-colors">
              🗑 Wipe All Staff Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Daily Report Tab ──────────────────────────────────────── */
function DailyReportTab() {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10));

  const generate = async (forceAI = false) => {
    setLoading(true);
    setReport(null);
    try {
      const todayStart = `${date}T00:00:00`;
      const todayEnd   = `${date}T23:59:59`;

      const [{ data: custData }, { data: staffData }, { data: savedReport }] = await Promise.all([
        supabase.from('customer_feedback').select('*').gte('created_at', todayStart).lte('created_at', todayEnd),
        supabase.from('staff_reports').select('*').gte('created_at', todayStart).lte('created_at', todayEnd),
        supabase.from('saved_daily_reports').select('*').eq('report_date', date).maybeSingle(),
      ]);

      const customers = custData || [];
      const staff     = staffData || [];

      // Phone frequency for returning customers
      const phoneFreq = {};
      customers.forEach((c) => { if (c.phone) phoneFreq[c.phone] = (phoneFreq[c.phone] || 0) + 1; });
      const returningCount = Object.values(phoneFreq).filter((v) => v > 1).length;

      const custAvgStars  = customers.length ? (customers.reduce((a, r) => a + r.stars, 0) / customers.length) : 0;
      const staffAvgStars = staff.length ? (staff.reduce((a, r) => a + r.day_stars, 0) / staff.length) : 0;
      const bestCust      = customers.reduce((best, r) => r.stars > (best?.stars || 0) ? r : best, null);
      const complaints    = staff.filter((r) => r.complaints && r.complaints.trim().length > 3).map((r) => r.complaints);

      // Try Gemini AI
      let aiParagraph = null;
      let aiError = null;

      // Use saved explicitly unless forcing a new AI generation
      if (savedReport?.ai_content && !forceAI) {
        aiParagraph = savedReport.ai_content;
      } else {
        const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (geminiKey) {
          try {
            const prompt = `You are the ZECHAI cafe manager. Based on today's data, write a Markdown formatted summary for the admin.
Use 3 clear sections with these exact headers:
## Highlights
## Lowlights
## Action Plan

Do not write a generic intro or outro. Be specific, actionable, and concise. Keep it under 150 words total.

CUSTOMER DATA (${customers.length} total, ${returningCount} returning):
${customers.map((c) => `- ${c.name}: ${c.stars}★, ordered: ${c.item_ordered}, feedback: "${c.feedback_msg}", suggestion: "${c.suggestion}"`).join('\n') || 'No feedback today.'}

STAFF DATA (${staff.length} reports):
${staff.map((s) => `- ${s.name}: day rating ${s.day_stars}★, complaints: "${s.complaints}", feedback: "${s.feedback}"`).join('\n') || 'No staff reports today.'}`;

            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.trim()}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
            });
            const json = await res.json();
            if (!res.ok) {
              aiError = json?.error?.message || `API Error: ${res.status}`;
              // Debug: fetch available models
              try {
                const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey.trim()}`);
                const mJson = await modelsRes.json();
                if (mJson.models) {
                  const supported = mJson.models.filter(m => m.supportedGenerationMethods.includes('generateContent')).map(m => m.name.replace('models/', '')).join(', ');
                  aiError += `\n\nYour API key supports these models: ${supported}`;
                }
              } catch (_) { /* ignore */ }
            } else {
              aiParagraph = json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
              if (aiParagraph) {
                await supabase.from('saved_daily_reports').upsert({
                  report_date: date,
                  ai_content: aiParagraph,
                  generated_at: new Date().toISOString()
                });
              }
            }
          } catch (err) { Object.assign(window, {ai_err: err}); aiError = err.message || 'Network request failed. Check CORS or API key validity.'; }
        }
      }

      setReport({
        date, customers, staff, custAvgStars, staffAvgStars, returningCount,
        bestCust, complaints, aiParagraph, aiError, generated: new Date().toLocaleTimeString(),
        onForcedRegenerate: () => generate(true)
      });
    } catch (err) {
      toast.error('Failed to generate report.');
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <p className="section-label mb-2">[ AI Analysis ]</p>
        <h2 className="text-3xl font-black uppercase">Daily Report<br/>Generator</h2>
        <div className="mt-3 h-1 w-10 bg-ink" />
      </div>

      <div className="flex gap-3 mb-8 items-end">
        <div>
          <label className="form-label">Report Date</label>
          <input type="date" className="form-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <button onClick={() => generate(false)} disabled={loading} className="btn-ghost py-3 px-6">
          {loading ? '⟳ Loading...' : '→ Analyze Day'}
        </button>
      </div>

      {!import.meta.env.VITE_GEMINI_API_KEY && (
        <div className="border border-primary p-4 bg-white mb-6">
          <p className="font-mono text-[11px] text-primary">
            ⚠ No VITE_GEMINI_API_KEY set — AI paragraph will be skipped. Add it to .env for full AI reports.
          </p>
        </div>
      )}

      {report && <ReportView report={report} />}
    </div>
  );
}

function ReportView({ report }) {
  const { date, customers, staff, custAvgStars, staffAvgStars, returningCount, bestCust, complaints, aiParagraph, aiError, generated, onForcedRegenerate } = report;
  return (
    <div className="border border-ink bg-white">
      {/* Report header */}
      <div className="border-b border-ink p-5 flex justify-between items-start bg-ink text-white">
        <div>
          <p className="font-mono text-[10px] tracking-widest text-gray-400 uppercase">[ Daily Report ]</p>
          <h3 className="font-black text-xl uppercase mt-1">{new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</h3>
        </div>
        <p className="font-mono text-[9px] text-gray-500">Generated {generated}</p>
      </div>

      {/* Customer section */}
      <div className="border-b border-ink p-5">
        <p className="section-label mb-4">[ Customer Summary ]</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border border-ink">
          <Stat label="Total Feedback" value={customers.length} small />
          <Stat label="Avg Rating" value={`${custAvgStars.toFixed(1)} ★`} small />
          <Stat label="Returning" value={returningCount} small accent />
          <Stat label="Best Rating" value={bestCust ? `${bestCust.stars}★ — ${bestCust.name}` : '—'} small />
        </div>
        {customers.length > 0 && (
          <div className="mt-4">
            <p className="form-label mb-2">All Feedback</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {customers.map((c, i) => (
                <div key={i} className="border border-muted p-3 flex gap-3">
                  <div className="flex-1">
                    <p className="font-mono text-[10px] font-bold">{c.name || 'Anonymous'} · {c.item_ordered}</p>
                    {c.feedback_msg && <p className="font-mono text-[10px] text-gray-600 mt-0.5">"{c.feedback_msg}"</p>}
                    {c.suggestion && <p className="font-mono text-[10px] text-primary mt-0.5">💡 {c.suggestion}</p>}
                  </div>
                  <div className="flex-shrink-0"><StarRating value={c.stars} readonly /></div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Staff section */}
      <div className="border-b border-ink p-5">
        <p className="section-label mb-4">[ Staff Summary ]</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 border border-ink">
          <Stat label="Reports" value={staff.length} small />
          <Stat label="Avg Day ★" value={`${staffAvgStars.toFixed(1)} ★`} small />
          <Stat label="Complaints" value={complaints.length} small />
        </div>
        {staff.length > 0 && (
          <div className="mt-4 space-y-2">
            {staff.map((s, i) => (
              <div key={i} className="border border-muted p-3">
                <div className="flex justify-between">
                  <p className="font-mono text-[10px] font-bold uppercase">{s.name}</p>
                  <StarRating value={s.day_stars} readonly />
                </div>
                {s.feedback && <p className="font-mono text-[10px] text-gray-600 mt-1">"{s.feedback}"</p>}
                {s.complaints && <p className="font-mono text-[10px] text-primary mt-1">⚠ {s.complaints}</p>}
                {s.suggestions && <p className="font-mono text-[10px] text-accent mt-1">💡 {s.suggestions}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Paragraph */}
      <div className="p-5 relative">
        <div className="flex justify-between items-center mb-3">
          <p className="section-label">[ AI Analysis ]</p>
          <button onClick={onForcedRegenerate} className="font-mono text-[9px] text-gray-400 hover:text-ink tracking-widest uppercase">
            ⟳ Regenerate (API)
          </button>
        </div>
        {aiError ? (
           <div className="border border-primary p-4 bg-white shadow-[4px_4px_0_0_#e1492c]">
             <p className="font-mono text-[11px] text-primary font-bold uppercase mb-2">⚠ AI Generation Failed</p>
             <p className="font-mono text-[10px] text-primary">{aiError}</p>
           </div>
        ) : aiParagraph ? (
          <div className="border-l-4 border-l-accent pl-5 space-y-2">
            {aiParagraph.split('\n').map((line, i) => {
              line = line.trim();
              if (!line) return null;
              // Bold headers
              if (line.match(/^#+\s/)) return <h4 key={i} className="font-black text-ink uppercase text-xs mt-6 mb-2 tracking-widest">{line.replace(/#/g,'').trim()}</h4>;
              // List items
              if (line.match(/^[-*]\s/)) return <li key={i} className="ml-4 font-mono text-[11px] text-gray-700 leading-relaxed max-w-prose">{line.replace(/^[-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</li>;
              // Regular text
              return <p key={i} className="font-mono text-[11px] text-gray-700 leading-relaxed max-w-prose">{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>;
            })}
          </div>
        ) : (
          <div className="border border-muted p-4 bg-paper">
            <p className="font-mono text-[11px] text-gray-500 text-center">
              Add <code className="bg-muted px-1">VITE_GEMINI_API_KEY</code> to .env to enable AI-generated insights.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────── */
function Stat({ label, value, accent, small }) {
  return (
    <div className={`border-r border-ink last:border-r-0 p-4 ${small ? 'p-3' : 'p-4'} bg-white`}>
      <p className={`font-mono text-[9px] tracking-widest uppercase text-gray-400 mb-1`}>{label}</p>
      <p className={`font-black ${small ? 'text-xl' : 'text-2xl'} ${accent ? 'text-accent' : 'text-ink'}`}>{value}</p>
    </div>
  );
}

function LoadingRow() {
  return (
    <div className="border border-ink bg-white p-12 text-center">
      <p className="font-mono text-[11px] text-gray-400 tracking-widest animate-pulse">Loading data...</p>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
