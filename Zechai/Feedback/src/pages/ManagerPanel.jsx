import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import FormInput from '../components/FormInput';
import StarRating from '../components/StarRating';
import ReactMarkdown from 'react-markdown';
import DailyReportViewer from '../components/DailyReportViewer';

export default function ManagerPanel() {
  const navigate = useNavigate();
  const [manager, setManager] = useState(null);
  const [activeTab, setActiveTab] = useState('staff');

  // Core Data
  const [staffDirectory, setStaffDirectory] = useState([]);
  const [staffFeedbacks, setStaffFeedbacks] = useState([]);
  const [staffMarks, setStaffMarks] = useState([]);
  const [customerFeedbacks, setCustomerFeedbacks] = useState([]);
  const [managerReportedToday, setManagerReportedToday] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const [myNotes, setMyNotes] = useState([]);
  const [allDailyReports, setAllDailyReports] = useState([]);
  const [expandedReport, setExpandedReport] = useState(null);
  const [viewingReportDate, setViewingReportDate] = useState(null);

  // Staff tab UI
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: '', phone: '', role: 'staff' });
  const [markingStaff, setMarkingStaff] = useState(null); // staff object being marked
  const [markForm, setMarkForm] = useState({ mark: '', note: '' });
  const [expandedFeedback, setExpandedFeedback] = useState(null);

  // Customer tab UI
  const [custSearch, setCustSearch] = useState('');
  const [custFilter, setCustFilter] = useState('all'); // all | 5 | 4 | 3 | 2 | 1
  const [expandedCust, setExpandedCust] = useState(null);

  // Manager End of Day
  const [managerForm, setManagerForm] = useState({ day_stars: 0, feedback: '', suggestions: '', complaints: '', others: '' });

  const today = new Date().toLocaleDateString('en-CA');
  const todayLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    const raw = localStorage.getItem('revumate_user');
    if (!raw) { navigate('/login'); return; }
    const p = JSON.parse(raw);
    if (p.role !== 'manager') { toast.error('Access Denied'); navigate('/login'); return; }
    setManager(p);
    loadCoreData(p);
  }, [navigate]);

  const loadCoreData = async (m) => {
    try {
      const [staffReq, reportCheckReq, aiReq, custReq, staffRptReq, marksReq, notesReq, allRptsReq] = await Promise.all([
        supabase.from('outlet_staff').select('*').eq('outlet_id', m.outlet_id).order('created_at'),
        supabase.from('staff_reports').select('id').eq('outlet_id', m.outlet_id).eq('is_manager_report', true).gte('created_at', `${today}T00:00:00`),
        supabase.from('saved_daily_reports').select('*').eq('outlet_id', m.outlet_id).eq('report_date', today).maybeSingle(),
        supabase.from('customer_feedback').select('*').or(`outlet_id.eq.${m.outlet_id},outlet_id.is.null`).order('created_at', { ascending: false }).limit(100),
        supabase.from('staff_reports').select('*').or(`outlet_id.eq.${m.outlet_id},outlet_id.is.null`).eq('is_manager_report', false).order('created_at', { ascending: false }).limit(50),
        supabase.from('staff_marks').select('*').eq('outlet_id', m.outlet_id).order('date', { ascending: false }),
        supabase.from('staff_notes').select('*').eq('target_phone', m.phone).order('created_at', { ascending: false }),
        supabase.from('saved_daily_reports').select('*').eq('outlet_id', m.outlet_id).order('report_date', { ascending: false })
      ]);
      if (staffReq.data) setStaffDirectory(staffReq.data);
      if (reportCheckReq.data?.length > 0) setManagerReportedToday(true);
      if (aiReq.data) setAiReport(aiReq.data);
      if (custReq.data) setCustomerFeedbacks(custReq.data);
      if (staffRptReq.data) setStaffFeedbacks(staffRptReq.data);
      if (marksReq.data) setStaffMarks(marksReq.data);
      if (notesReq.data) setMyNotes(notesReq.data);
      if (allRptsReq.data) setAllDailyReports(allRptsReq.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to sync data.');
    }
  };

  // ── Customer Stats ──
  const custStats = useMemo(() => {
    const total = customerFeedbacks.length;
    const avg = total ? (customerFeedbacks.reduce((a, c) => a + c.stars, 0) / total).toFixed(1) : 'N/A';
    const withPhone = customerFeedbacks.filter(c => c.phone).length;
    const items = {};
    customerFeedbacks.forEach(c => {
      if (!c.item_ordered) return;
      const k = c.item_ordered.toLowerCase();
      items[k] = (items[k] || 0) + 1;
    });
    const bestItem = Object.entries(items).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const five = customerFeedbacks.filter(c => c.stars === 5).length;
    return { total, avg, withPhone, bestItem, five };
  }, [customerFeedbacks]);

  const filteredCustomers = useMemo(() => {
    return customerFeedbacks.filter(c => {
      const matchSearch = !custSearch || c.name?.toLowerCase().includes(custSearch.toLowerCase()) || c.item_ordered?.toLowerCase().includes(custSearch.toLowerCase());
      const matchFilter = custFilter === 'all' || String(c.stars) === custFilter;
      return matchSearch && matchFilter;
    });
  }, [customerFeedbacks, custSearch, custFilter]);

  // ── Staff Marks Helpers ──
  const getStaffAvgMark = (staffPhone) => {
    const m = staffMarks.filter(m => m.staff_phone === staffPhone);
    if (!m.length) return null;
    return (m.reduce((a, v) => a + v.mark, 0) / m.length).toFixed(1);
  };
  const getStaffTodayMark = (staffPhone) => staffMarks.find(m => m.staff_phone === staffPhone && m.date === today);

  const handleGiveMark = async () => {
    if (!markingStaff) return;
    const mark = parseInt(markForm.mark);
    if (isNaN(mark) || mark < 0 || mark > 10) { toast.error('Mark must be 0–10'); return; }
    if (getStaffTodayMark(markingStaff.phone)) { toast.error('Already marked today'); return; }
    toast.loading('Saving mark...', { id: 'mark' });
    const { error } = await supabase.from('staff_marks').insert([{
      staff_name: markingStaff.name,
      staff_phone: markingStaff.phone,
      mark,
      admin_note: markForm.note.trim() || null,
      date: today,
      outlet_id: manager.outlet_id
    }]);
    if (error) { toast.error('Failed', { id: 'mark' }); }
    else {
      toast.success('Mark saved!', { id: 'mark' });
      setMarkingStaff(null);
      setMarkForm({ mark: '', note: '' });
      loadCoreData(manager);
    }
  };

  // ── Add Staff ──
  const handleAddStaff = async (e) => {
    e.preventDefault();
    if (!newStaff.name.trim() || !newStaff.phone.trim()) return;
    toast.loading('Registering...', { id: 'staff' });
    const { error } = await supabase.from('outlet_staff').insert([{
      outlet_id: manager.outlet_id,
      name: newStaff.name.trim(),
      phone: newStaff.phone.trim(),
      role: newStaff.role
    }]);
    if (error) { toast.error('Failed or phone exists.', { id: 'staff' }); }
    else { toast.success('Staff added!', { id: 'staff' }); setNewStaff({ name: '', phone: '', role: 'staff' }); setShowAddStaff(false); loadCoreData(manager); }
  };

  // ── Remove Staff ──
  const handleRemoveStaff = async (staff) => {
    if (!window.confirm(`Remove "${staff.name}" from the roster? This cannot be undone.`)) return;
    toast.loading('Removing...', { id: 'remove' });
    const { error } = await supabase.from('outlet_staff').delete().eq('id', staff.id);
    if (error) { toast.error('Failed to remove.', { id: 'remove' }); }
    else { toast.success(`${staff.name} removed.`, { id: 'remove' }); loadCoreData(manager); }
  };

  // ── Manager End of Day ──
  const handleManagerEndDay = async (e) => {
    e.preventDefault();
    if (managerForm.day_stars === 0) { toast.error('Rate the day.'); return; }
    toast.loading('Locking operations...', { id: 'lock' });
    const { error } = await supabase.from('staff_reports').insert([{
      outlet_id: manager.outlet_id, name: manager.name, phone: manager.phone,
      day_stars: managerForm.day_stars, feedback: managerForm.feedback,
      complaints: managerForm.complaints, suggestions: managerForm.suggestions,
      others: managerForm.others, is_manager_report: true
    }]);
    if (error) { toast.error('Failed', { id: 'lock' }); }
    else { toast.success('STORE LOCKED', { id: 'lock' }); setManagerReportedToday(true); }
  };

  // ── AI Report ──
  const generateAIReport = async () => {
    if (!managerReportedToday) return toast.error('Submit Manager Report first!');
    if (aiReport) return toast.error('Report already exists for today.');
    toast.loading('Compiling...', { id: 'ai' });
    try {
      const [{ data: customers }, { data: staff }] = await Promise.all([
        supabase.from('customer_feedback').select('*').or(`outlet_id.eq.${manager.outlet_id},outlet_id.is.null`).gte('created_at', `${today}T00:00:00`),
        supabase.from('staff_reports').select('*').or(`outlet_id.eq.${manager.outlet_id},outlet_id.is.null`).gte('created_at', `${today}T00:00:00`)
      ]);

      const custAvg = customers?.length ? (customers.reduce((a, c) => a + c.stars, 0) / customers.length).toFixed(1) : 0;
      const items = {};
      customers?.forEach(c => { if (!c.item_ordered) return; const k = c.item_ordered.toLowerCase(); items[k] = (items[k] || 0) + 1; });
      const itemRanking = Object.entries(items).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} (x${v})`).join(', ') || 'None';
      const starDist = [1,2,3,4,5].map(s => `${s}★: ${customers?.filter(c => c.stars === s).length || 0}`).join(', ');
      const feedbackSamples = customers?.filter(c => c.feedback_msg).slice(0, 5).map(c => `"${c.feedback_msg}"`).join(' | ') || 'None';
      const staffSummaries = staff?.filter(s => !s.is_manager_report).map(s => `${s.name} (${s.day_stars}/5): ${s.feedback}${s.complaints && s.complaints !== 'None' ? ' | Issue: ' + s.complaints : ''}`).join('\n') || 'No staff reports';
      const managerReport = staff?.find(s => s.is_manager_report);

      const prompt = `You are the Outlet Manager at REVUMATE cafe. Write a detailed, sharp executive summary of today's operations.

CUSTOMER DATA:
- Total Customers: ${customers?.length || 0}
- Average Rating: ${custAvg}/5
- Star Distribution: ${starDist}
- Top Items Ordered: ${itemRanking}
- Customer Feedback Samples: ${feedbackSamples}

STAFF DATA:
- Staff Reports Submitted: ${staff?.filter(s => !s.is_manager_report).length || 0}
${staffSummaries}

MANAGER SUMMARY:
${managerReport ? `Rating: ${managerReport.day_stars}/5 | ${managerReport.feedback} | Issues: ${managerReport.complaints} | Tomorrow: ${managerReport.suggestions}` : 'Not submitted'}

Format in clean markdown:
1. A bold **Key Metrics** bullet list at top
2. **Customer Experience** section
3. **Staff Performance** section  
4. **Issues & Complaints** section (only real ones, skip if none)
5. **Tomorrow's Directives**

Be direct and factual. Only use the data provided. Do not fabricate or hallucinate.`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }] })
      });
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('No content');
      const { error } = await supabase.from('saved_daily_reports').insert([{ report_date: today, outlet_id: manager.outlet_id, ai_content: content }]);
      if (error) throw error;
      toast.success('Vaulted!', { id: 'ai' });
      setAiReport({ report_date: today, ai_content: content });
      setAllDailyReports(prev => [{ report_date: today, ai_content: content }, ...prev]);
    } catch (err) { console.error(err); toast.error('AI Engine failure', { id: 'ai' }); }
  };

  // ── Delete Daily Report ──
  const handleDeleteReport = async (report) => {
    if (!window.confirm(`Delete report for ${report.report_date}? This cannot be undone.`)) return;
    toast.loading('Deleting...', { id: 'del' });
    const { error } = await supabase.from('saved_daily_reports').delete().eq('report_date', report.report_date).eq('outlet_id', manager.outlet_id);
    if (error) { toast.error('Failed to delete', { id: 'del' }); }
    else {
      toast.success('Report deleted', { id: 'del' });
      setAllDailyReports(prev => prev.filter(r => r.report_date !== report.report_date));
      if (aiReport?.report_date === report.report_date) setAiReport(null);
    }
  };

  const handleLogout = () => { localStorage.removeItem('revumate_user'); navigate('/login'); };

  if (!manager) return null;

  const TABS = ['customers', 'staff', 'daily report', 'notes'];

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink font-mono">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="border-b-2 border-ink bg-white sticky top-0 z-20 flex items-center justify-between px-6 py-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-ink bg-ink text-white flex items-center justify-center font-black shadow-[2px_2px_0px_0px_rgba(33,186,177,1)]">OP</div>
          <div>
            <h1 className="font-black text-xl tracking-tighter uppercase leading-none">Outlet Protocol</h1>
            <p className="text-[10px] tracking-widest text-accent uppercase font-bold">[{manager.name}] · {todayLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-widest">
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 border-2 border-ink transition-all ${activeTab === tab ? 'bg-primary text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-gray-50'}`}>
              {tab}
              {tab === 'notes' && myNotes.length > 0 && <span className="ml-1.5 bg-red-500 text-white text-[8px] rounded-full px-1.5 py-0.5">{myNotes.length}</span>}
            </button>
          ))}
          <button onClick={handleLogout} className="px-4 py-2 border-2 text-red-600 border-red-200 bg-red-50 hover:bg-red-100 ml-2">SIGNOUT</button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full space-y-6">

        {/* ══ CUSTOMERS TAB ══ */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Total Feedback', value: custStats.total, color: '' },
                { label: 'Avg Rating', value: custStats.avg ? `${custStats.avg}★` : 'N/A', color: 'text-primary' },
                { label: 'Best Seller', value: custStats.bestItem, color: '' },
                { label: '5⭐ Reviews', value: custStats.five, color: 'text-green-600' },
                { label: 'Identified', value: custStats.withPhone, color: 'text-accent' },
              ].map(s => (
                <div key={s.label} className="border-2 border-ink bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[8px] text-gray-400 uppercase tracking-widest">{s.label}</p>
                  <p className={`font-black text-xl mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 flex-wrap items-center">
              <input
                type="text"
                placeholder="Search by name or item..."
                className="border-2 border-ink bg-white px-4 py-2 font-mono text-sm focus:outline-none focus:border-primary flex-1 max-w-xs"
                value={custSearch}
                onChange={e => setCustSearch(e.target.value)}
              />
              <div className="flex gap-1">
                {['all', '5', '4', '3', '2', '1'].map(f => (
                  <button key={f} onClick={() => setCustFilter(f)}
                    className={`px-3 py-2 border-2 border-ink text-xs font-bold transition-all ${custFilter === f ? 'bg-primary text-white' : 'bg-white hover:bg-gray-50'}`}>
                    {f === 'all' ? 'ALL' : `${f}★`}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="border-2 border-ink bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="border-b-2 border-ink grid grid-cols-4 bg-paper p-3 text-[10px] font-black uppercase tracking-widest">
                <span>Customer</span><span>Item Ordered</span><span>Rating</span><span>Date</span>
              </div>
              <div className="divide-y divide-muted overflow-y-auto max-h-[500px]">
                {filteredCustomers.length === 0 ? (
                  <p className="text-center font-mono text-xs text-gray-400 py-8">No feedback matches.</p>
                ) : filteredCustomers.map(c => (
                  <div key={c.id}>
                    <button
                      onClick={() => setExpandedCust(expandedCust === c.id ? null : c.id)}
                      className="w-full grid grid-cols-4 p-3 text-xs text-left hover:bg-gray-50 gap-2 items-center">
                      <span className="font-bold uppercase truncate">{c.name}</span>
                      <span className="truncate text-gray-600">{c.item_ordered}</span>
                      <span className={`font-black text-base ${c.stars >= 4 ? 'text-green-600' : c.stars === 3 ? 'text-yellow-500' : 'text-red-500'}`}>{c.stars}★</span>
                      <span className="text-gray-400 text-[10px]">{new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                    </button>
                    {expandedCust === c.id && (
                      <div className="bg-gray-50 border-t border-muted px-4 py-3 space-y-2 text-xs font-mono">
                        {c.phone && <p><span className="text-gray-400 uppercase">Phone:</span> {c.phone}</p>}
                        {c.feedback_msg && <p><span className="text-gray-400 uppercase">Feedback:</span> {c.feedback_msg}</p>}
                        {c.suggestion && <p><span className="text-gray-400 uppercase">Suggestion:</span> {c.suggestion}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ STAFF TAB ══ */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            {/* Mark Modal */}
            {markingStaff && (
              <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white border-2 border-ink shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 w-full max-w-sm space-y-4">
                  <p className="section-label">[ Give Daily Mark ]</p>
                  <h3 className="font-black text-2xl uppercase">{markingStaff.name}</h3>
                  <p className="font-mono text-[10px] text-gray-400">{markingStaff.role} · {markingStaff.phone}</p>
                  <div>
                    <label className="form-label">Mark (0–10) *</label>
                    <input
                      type="number" min="0" max="10"
                      className="form-input w-full font-black text-3xl text-center border-2 border-ink focus:outline-none focus:border-primary"
                      value={markForm.mark}
                      onChange={e => setMarkForm(p => ({ ...p, mark: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="form-label">Note to Staff (Optional)</label>
                    <textarea rows={2} className="form-input w-full font-mono text-sm resize-none"
                      value={markForm.note} onChange={e => setMarkForm(p => ({ ...p, note: e.target.value }))} placeholder="e.g. Great job handling the rush..." />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleGiveMark} className="btn-primary flex-1 py-3 text-xs font-bold tracking-widest uppercase">Submit Mark</button>
                    <button onClick={() => { setMarkingStaff(null); setMarkForm({ mark: '', note: '' }); }} className="btn-ghost flex-1 py-3 text-xs border-2 border-ink">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            {/* Add Staff toggle */}
            <div className="flex justify-between items-center">
              <p className="section-label">[ Active Roster ]</p>
              <button onClick={() => setShowAddStaff(v => !v)} className="btn-primary px-5 py-2 text-xs font-bold tracking-widest uppercase">
                {showAddStaff ? '✕ Cancel' : '+ Add Staff'}
              </button>
            </div>

            {showAddStaff && (
              <div className="border-2 border-ink bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-md">
                <form onSubmit={handleAddStaff} className="space-y-4">
                  <FormInput id="sname" label="Full Name" required value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
                  <FormInput id="sphone" label="Phone (Login)" required type="tel" value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} />
                  <div>
                    <label className="form-label">Role</label>
                    <select className="form-input w-full appearance-none bg-white font-mono text-sm" value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })}>
                      <option value="staff">Service Staff</option>
                      <option value="kitchen">Kitchen Staff</option>
                      <option value="barista">Barista</option>
                    </select>
                  </div>
                  <button type="submit" className="btn-primary w-full py-3 text-xs tracking-widest uppercase font-bold">Register</button>
                </form>
              </div>
            )}

            {/* Staff Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {staffDirectory.map(s => {
                const todayMark = getStaffTodayMark(s.phone);
                const avgMark = getStaffAvgMark(s.phone);
                const todayReport = staffFeedbacks.find(f => f.staff_id === s.id);
                return (
                  <div key={s.id} className="border-2 border-ink bg-white p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="w-8 h-8 bg-accent flex items-center justify-center mb-2">
                          <span className="text-white font-black text-sm">{s.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <p className="font-black text-sm uppercase">{s.name}</p>
                        <p className="font-mono text-[9px] text-gray-400 uppercase">{s.role} · {s.phone}</p>
                      </div>
                      <div className="text-right">
                        {todayMark ? (
                          <div>
                            <p className="font-black text-2xl text-primary">{todayMark.mark}<span className="text-xs opacity-50">/10</span></p>
                            <p className="text-[8px] text-gray-400 uppercase">today's mark</p>
                          </div>
                        ) : (
                          <button onClick={() => setMarkingStaff(s)}
                            className="bg-primary border-2 border-ink text-white text-[9px] font-bold px-3 py-1.5 hover:bg-black transition-colors uppercase tracking-widest">
                            Give Mark
                          </button>
                        )}
                      </div>
                    </div>

                    {avgMark && <p className="font-mono text-[10px] text-gray-500 mb-2">Avg Mark: <span className="font-bold text-ink">{avgMark}/10</span></p>}

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemoveStaff(s)}
                      className="mt-1 mb-1 text-[9px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 hover:underline font-mono">
                      ✕ Remove from Roster
                    </button>

                    {/* Today's Report Preview */}
                    {todayReport ? (
                      <div>
                        <button onClick={() => setExpandedFeedback(expandedFeedback === s.id ? null : s.id)}
                          className="w-full text-left text-[9px] font-bold uppercase tracking-widest text-accent border border-accent px-3 py-1.5 hover:bg-accent/10 mt-2">
                          {expandedFeedback === s.id ? '▲ Hide Report' : `▼ View Today's Report (${todayReport.day_stars}/5)`}
                        </button>
                        {expandedFeedback === s.id && (
                          <div className="mt-2 border border-muted bg-gray-50 p-3 space-y-2 text-xs">
                            <p><span className="text-gray-400 uppercase font-bold">Feedback:</span> {todayReport.feedback}</p>
                            {todayReport.complaints && todayReport.complaints !== 'None' && (
                              <p className="text-red-700 border-l-2 border-red-500 pl-2"><span className="font-bold">Issue:</span> {todayReport.complaints}</p>
                            )}
                            {todayReport.suggestions && todayReport.suggestions !== 'None' && (
                              <p><span className="text-gray-400 uppercase font-bold">Suggestion:</span> {todayReport.suggestions}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="font-mono text-[9px] text-gray-400 mt-2 italic">No report today yet.</p>
                    )}
                  </div>
                );
              })}
              {staffDirectory.length === 0 && (
                <div className="col-span-3 border-2 border-dashed border-muted p-12 text-center">
                  <p className="font-mono text-xs text-gray-400">No staff registered yet. Click "+ Add Staff".</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ DAILY REPORT TAB ══ */}
        {activeTab === 'daily report' && (
          <div className="space-y-6">
            {viewingReportDate ? (
              <div className="space-y-6 max-w-4xl">
                <div className="flex justify-between items-center mb-4">
                  <button onClick={() => setViewingReportDate(null)}
                    className="font-mono text-xs uppercase tracking-widest text-gray-500 hover:text-ink flex items-center gap-2">
                    ← Back to Reports List
                  </button>
                  <button 
                    onClick={() => {
                        const report = allDailyReports.find(r => r.report_date === viewingReportDate);
                        if (report) handleDeleteReport(report).then(() => setViewingReportDate(null));
                    }}
                    className="text-[10px] font-bold text-red-500 border border-red-200 px-3 py-1.5 uppercase tracking-widest hover:bg-red-50"
                  >
                    ✕ Delete Report
                  </button>
                </div>
                <div className="border-2 border-ink bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                   <p className="section-label mb-2">[ Report for {viewingReportDate} ]</p>
                   <DailyReportViewer manager={manager} today={viewingReportDate} />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Current Status Card */}
                {!managerReportedToday ? (
                  <div className="max-w-2xl border-2 border-red-600 bg-red-50 p-8 shadow-[6px_6px_0px_0px_rgba(220,38,38,1)]">
                    <p className="section-label !text-red-600 mb-4">[ OUTLET SHUTDOWN SEQUENCE ]</p>
                    <div className="bg-white border-2 border-red-200 p-4 mb-6">
                      <p className="text-xs text-red-800 uppercase font-bold text-center">WARNING: SUBMITTING THIS PERMANENTLY LOCKS THE OUTLET FOR THE DAY.</p>
                    </div>
                    <form onSubmit={handleManagerEndDay} className="space-y-5">
                      <div className="border-2 border-ink p-4 bg-white">
                        <label className="form-label">Manager Day Rating <span className="text-red-500">*</span></label>
                        <StarRating value={managerForm.day_stars} onChange={v => setManagerForm(p => ({ ...p, day_stars: v }))} size="lg" />
                      </div>
                      <FormInput id="m-fd" label="Operational Summary" required textarea rows={3} value={managerForm.feedback} onChange={e => setManagerForm(p => ({ ...p, feedback: e.target.value }))} />
                      <FormInput id="m-cp" label="Critical Incidents / Complaints" required textarea rows={2} value={managerForm.complaints} onChange={e => setManagerForm(p => ({ ...p, complaints: e.target.value }))} />
                      <FormInput id="m-sg" label="Directives for Tomorrow" required textarea rows={2} value={managerForm.suggestions} onChange={e => setManagerForm(p => ({ ...p, suggestions: e.target.value }))} />
                      <button type="submit" className="w-full bg-red-600 text-white font-black uppercase tracking-widest py-4 border-2 border-ink hover:bg-black transition-colors">
                        Execute Shutdown Protocol
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="max-w-2xl border-2 border-green-600 bg-green-50 p-6 shadow-[4px_4px_0px_0px_rgba(22,163,74,1)]">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <div>
                        <h2 className="text-xl font-black text-green-700 uppercase leading-none">Outlet Locked ✓</h2>
                        <p className="text-[10px] text-green-800 font-bold mt-1 uppercase tracking-widest">Today's Wrap-up Complete</p>
                      </div>
                      <div className="flex gap-3 items-center">
                        {!aiReport ? (
                          <button onClick={generateAIReport} className="btn-primary py-3 px-6 text-[10px] font-bold tracking-widest uppercase">Generate Intel</button>
                        ) : (
                          <button onClick={() => setViewingReportDate(today)} className="btn-accent py-3 px-6 text-[10px] font-bold tracking-widest uppercase">Open Today's Report</button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Historical Tile Grid */}
                <div className="space-y-4">
                  <p className="section-label">[ Intel Vault ]</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {allDailyReports.map(r => (
                      <button 
                        key={r.report_date} 
                        onClick={() => setViewingReportDate(r.report_date)}
                        className={`border-2 border-ink bg-white p-4 text-left hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between group h-32 ${r.report_date === today ? 'border-primary shadow-[4px_4px_0px_0px_rgba(33,186,177,1)]' : ''}`}
                      >
                        <div>
                          <p className={`font-black text-xs uppercase leading-none ${r.report_date === today ? 'text-primary' : 'text-ink'}`}>
                            {new Date(r.report_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                          <p className="font-mono text-[9px] text-gray-400 uppercase mt-1">
                            {new Date(r.report_date).toLocaleDateString('en-IN', { weekday: 'short' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-accent uppercase tracking-widest group-hover:underline">Read →</p>
                        </div>
                      </button>
                    ))}
                    {allDailyReports.length === 0 && (
                      <p className="font-mono text-[10px] text-gray-400 py-8">No historical reports archived.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ NOTES TAB ══ */}
        {activeTab === 'notes' && (
          <div className="max-w-2xl space-y-4">
            <div className="border-b-2 border-ink pb-4">
              <p className="section-label">[ Private Notes from HQ ]</p>
              <p className="font-mono text-[10px] text-gray-400 mt-1">Only visible to you.</p>
            </div>
            {myNotes.length === 0 ? (
              <p className="font-mono text-xs text-gray-400 py-12 text-center">No notes yet.</p>
            ) : myNotes.map(n => (
              <div key={n.id} className="border-2 border-ink bg-white p-5 shadow-[3px_3px_0px_0px_rgba(33,186,177,1)]">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-accent bg-accent/10 px-2 py-1">📩 From HQ Admin</span>
                  <span className="font-mono text-[9px] text-gray-400">{new Date(n.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <p className="font-mono text-sm text-ink leading-relaxed">{n.note}</p>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
