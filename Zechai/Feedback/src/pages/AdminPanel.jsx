import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import FormInput from '../components/FormInput';
import ReactMarkdown from 'react-markdown';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('outlets');
  const [outlets, setOutlets] = useState([]);

  // Selected outlet drill-down
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [outletStats, setOutletStats] = useState(null);
  const [outletDailyReports, setOutletDailyReports] = useState([]);
  const [outletStaffList, setOutletStaffList] = useState([]);
  const [outletNotes, setOutletNotes] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [expandedReport, setExpandedReport] = useState(null);

  // Notes form
  const [noteTarget, setNoteTarget] = useState('manager'); // 'manager' or staff id
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Create outlet form
  const [showCreate, setShowCreate] = useState(false);
  const [newOutlet, setNewOutlet] = useState({ name: '', manager_name: '', manager_phone: '' });

  // Master intel
  const [masterIntel, setMasterIntel] = useState(null);
  const [masterReportsHistory, setMasterReportsHistory] = useState([]);

  const today = new Date().toLocaleDateString('en-CA');

  useEffect(() => { loadOutlets(); }, []);

  const loadOutlets = async () => {
    const { data: oData } = await supabase.from('outlets').select('*').order('created_at');
    const { data: mData } = await supabase.from('master_reports').select('*').order('period_start', { ascending: false });
    if (oData) setOutlets(oData);
    if (mData) setMasterReportsHistory(mData);
  };

  const handleCreateOutlet = async (e) => {
    e.preventDefault();
    if (!newOutlet.name.trim() || !newOutlet.manager_name.trim() || !newOutlet.manager_phone.trim()) return;
    toast.loading('Deploying...', { id: 'outlet' });
    const { error } = await supabase.from('outlets').insert([newOutlet]);
    if (error) { toast.error('Failed or phone already used.', { id: 'outlet' }); }
    else {
      toast.success('Outlet live!', { id: 'outlet' });
      setNewOutlet({ name: '', manager_name: '', manager_phone: '' });
      setShowCreate(false);
      loadOutlets();
    }
  };

  const handleSelectOutlet = async (outlet) => {
    setSelectedOutlet(outlet);
    setOutletStats(null);
    setOutletDailyReports([]);
    setOutletStaffList([]);
    setOutletNotes([]);
    setLoadingStats(true);
    try {
      const [{ data: cData }, { data: sData }, { data: rData }, { data: staffData }, { data: notesData }] = await Promise.all([
        supabase.from('customer_feedback').select('*').or(`outlet_id.eq.${outlet.id},outlet_id.is.null`),
        supabase.from('staff_reports').select('*').or(`outlet_id.eq.${outlet.id},outlet_id.is.null`),
        supabase.from('saved_daily_reports').select('*').eq('outlet_id', outlet.id).order('report_date', { ascending: false }),
        supabase.from('outlet_staff').select('id, name, phone, role').eq('outlet_id', outlet.id),
        supabase.from('staff_notes').select('*').eq('outlet_id', outlet.id).order('created_at', { ascending: false })
      ]);

      const cust = cData || [];
      const avg = cust.length ? (cust.reduce((a, c) => a + c.stars, 0) / cust.length).toFixed(1) : 'N/A';
      let bestItem = 'N/A'; let maxCt = 0; const items = {};
      cust.forEach(c => {
        if (!c.item_ordered) return;
        const i = c.item_ordered.toLowerCase();
        items[i] = (items[i] || 0) + 1;
        if (items[i] > maxCt) { maxCt = items[i]; bestItem = c.item_ordered; }
      });
      const staffFreq = {}; let leader = 'N/A'; let lsCt = 0;
      (sData || []).forEach(s => {
        if (s.is_manager_report) return;
        staffFreq[s.name] = (staffFreq[s.name] || 0) + 1;
        if (staffFreq[s.name] > lsCt) { lsCt = staffFreq[s.name]; leader = s.name; }
      });
      setOutletStats({ avg, bestItem, leader, totalCust: cust.length });
      setOutletDailyReports(rData || []);
      setOutletStaffList(staffData || []);
      setOutletNotes(notesData || []);
    } catch (err) {
      toast.error('Failed to load outlet data');
    }
    setLoadingStats(false);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    // Determine target name and phone
    let targetName, targetPhone;
    if (noteTarget === 'manager') {
      targetName = selectedOutlet.manager_name;
      targetPhone = selectedOutlet.manager_phone;
    } else {
      const staff = outletStaffList.find(s => s.id === noteTarget);
      if (!staff) { setSavingNote(false); return; }
      targetName = staff.name;
      targetPhone = staff.phone;
    }

    const { error } = await supabase.from('staff_notes').insert([{
      outlet_id: selectedOutlet.id,
      target_phone: targetPhone,
      target_name: targetName,
      note: noteText.trim()
    }]);

    if (error) { toast.error('Failed to save note'); }
    else {
      toast.success('Note sent!');
      setNoteText('');
      // Refresh notes
      const { data } = await supabase.from('staff_notes').select('*').eq('outlet_id', selectedOutlet.id).order('created_at', { ascending: false });
      setOutletNotes(data || []);
    }
    setSavingNote(false);
  };

  const reassignManager = async (outletId) => {
    const newName = window.prompt("New Manager Name:");
    if (!newName) return;
    const newPhone = window.prompt("New Manager Phone:");
    if (!newPhone) return;
    toast.loading('Reassigning...', { id: 'reassign' });
    const { error } = await supabase.from('outlets').update({ manager_name: newName, manager_phone: newPhone }).eq('id', outletId);
    if (error) { toast.error('Failed', { id: 'reassign' }); }
    else {
      toast.success('Manager reassigned', { id: 'reassign' });
      setSelectedOutlet(prev => ({ ...prev, manager_name: newName, manager_phone: newPhone }));
      loadOutlets();
    }
  };

  const generateMasterReport = async (type) => {
    if (!window.confirm(`Generate Master ${type.toUpperCase()} Report?`)) return;
    toast.loading(`Compiling ${type} data...`, { id: 'master' });
    try {
      let start = new Date();
      if (type === 'weekly') start.setDate(start.getDate() - 7);
      if (type === 'monthly') start.setMonth(start.getMonth() - 1);
      start.setHours(0, 0, 0, 0);
      const startStr = start.toISOString();

      const { data: locks } = await supabase.from('master_reports')
        .select('*').eq('report_type', type).gte('period_start', startStr.split('T')[0]).limit(1);
      if (locks && locks.length > 0) {
        toast.error(`Already generated a ${type} report for this period!`, { id: 'master' }); return;
      }

      const [{ data: cData }, { data: sData }, { data: oData }] = await Promise.all([
        supabase.from('customer_feedback').select('*').gte('created_at', startStr),
        supabase.from('staff_reports').select('*').gte('created_at', startStr),
        supabase.from('outlets').select('*')
      ]);

      if (!cData?.length && !sData?.length) {
        toast.error('No data in this period. Aborted.', { id: 'master' }); return;
      }

      // ── ADVANCED DATA COLLATION ──
      const outletContexts = (oData || []).map((o, idx) => {
        // If feedback is null, and this is the first outlet or named HQ, include it for statistics completeness
        const oFeedback = cData?.filter(c => c.outlet_id === o.id || (!c.outlet_id && (o.name === 'HQ' || (oData.length === 1 && idx === 0)))) || [];
        const oReports = sData?.filter(s => s.outlet_id === o.id) || [];
        const managerRpt = oReports.find(r => r.is_manager_report);
        const staffComplaints = oReports.filter(r => !r.is_manager_report && r.complaints && r.complaints !== 'None');

        const avgRating = oFeedback.length ? (oFeedback.reduce((a,c) => a+c.stars,0)/oFeedback.length).toFixed(1) : 'N/A';
        const items = {}; oFeedback.forEach(c => { if(c.item_ordered) items[c.item_ordered] = (items[c.item_ordered] || 0) + 1; });
        const topItem = Object.entries(items).sort((a,b) => b[1]-a[1])[0]?.[0] || 'N/A';

        return `
[OUTLET: ${o.name}]
- Manager: ${o.manager_name}
- Performance: ${avgRating}★ from ${oFeedback.length} customers.
- Top Seller: ${topItem}
- Manager Summary: ${managerRpt ? managerRpt.feedback : 'No report submitted.'}
- Critical Complaints/Issues: ${managerRpt?.complaints || 'None'}
- Staff Issues: ${staffComplaints.map(s => `${s.name}: ${s.complaints}`).join(' | ') || 'None'}
- Staff Suggestions: ${managerRpt?.suggestions || 'None'}`;
      }).join('\n\n');

      const prompt = `You are the High-Command Intelligence Officer for Revumate. Write a ${type.toUpperCase()} Master Strategic report for the period starting ${startStr.split('T')[0]}.

GLOBAL DATA SUMMARY:
Total Customers: ${cData?.length || 0}
Total Staff Reports: ${sData?.filter(s => !s.is_manager_report).length || 0}

SPECIFIC OUTLET INTEL:
${outletContexts}

REPORT GUIDELINES:
1. Use the EXACT NAMES of outlets and managers provided.
2. Highlight specific wins and critical issues from the data.
3. If an outlet shows "N/A" or "No report", call it out as a "Communication BLACKOUT".
4. DO NOT HALLUCINATE. Do not mention morning sessions, training, or marketing unless they are explicitly in the summaries above.
5. Markdown format with sharp, professional headers.
6. Period: ${startStr.split('T')[0]} to ${today}`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}` },
        body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }] })
      });
      const json = await res.json();
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('No AI content');

      const { error } = await supabase.from('master_reports').insert([{
        report_type: type, period_start: startStr.split('T')[0], period_end: today, ai_content: content
      }]);
      if (error) throw error;
      toast.success('Vaulted!', { id: 'master' });
      setMasterIntel(content);
      loadOutlets(); // Refresh history
    } catch (err) {
      console.error(err);
      toast.error('Engine failure', { id: 'master' });
    }
  };

  const handleDeleteMasterReport = async (reportId) => {
    if (!window.confirm("Delete this Master Strategic report? This cannot be undone.")) return;
    toast.loading('Deleting...', { id: 'del' });
    const { error } = await supabase.from('master_reports').delete().eq('id', reportId);
    if (error) { toast.error('Failed to delete', { id: 'del' }); }
    else {
      toast.success('Report deleted', { id: 'del' });
      loadOutlets();
      if (expandedReport === reportId) setExpandedReport(null);
    }
  };

  const handleLogout = () => { localStorage.removeItem('revumate_admin'); navigate('/admin-login'); };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink font-mono">
      <Toaster position="top-center" />

      {/* Header */}
      <header className="border-b-2 border-ink bg-white sticky top-0 z-20 flex items-center justify-between px-6 py-4 gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 border-2 border-ink bg-primary flex items-center justify-center font-black text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            HQ
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tighter uppercase leading-none">REVUMATE NETWORK</h1>
            <p className="text-[10px] tracking-widest text-primary uppercase font-bold mt-0.5">Master Override Enabled</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs font-bold uppercase tracking-widest flex-wrap">
          {['outlets', 'master intel'].map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setSelectedOutlet(null); }}
              className={`px-4 py-2 border-2 border-ink transition-all ${activeTab === tab ? 'bg-primary text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-white hover:bg-gray-50'}`}>
              {tab}
            </button>
          ))}
          <button onClick={handleLogout} className="px-4 py-2 border-2 text-red-600 border-red-200 bg-red-50 hover:bg-red-100">SIGNOUT</button>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">

        {/* ── OUTLETS GRID ── */}
        {activeTab === 'outlets' && !selectedOutlet && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="section-label">[ Operational Bases ]</p>
              <button onClick={() => setShowCreate(v => !v)}
                className="btn-primary px-6 py-2 text-xs font-bold tracking-widest uppercase">
                {showCreate ? '✕ Cancel' : '+ New Outlet'}
              </button>
            </div>

            {showCreate && (
              <div className="border-2 border-ink bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-md">
                <p className="section-label mb-4">[ Deploy New Base ]</p>
                <form onSubmit={handleCreateOutlet} className="space-y-4">
                  <FormInput id="oname" label="Outlet Name / Location" required value={newOutlet.name} onChange={e => setNewOutlet({ ...newOutlet, name: e.target.value })} />
                  <FormInput id="mname" label="Manager Full Name" required value={newOutlet.manager_name} onChange={e => setNewOutlet({ ...newOutlet, manager_name: e.target.value })} />
                  <FormInput id="mphone" label="Manager Phone (their login)" type="tel" required value={newOutlet.manager_phone} onChange={e => setNewOutlet({ ...newOutlet, manager_phone: e.target.value })} />
                  <button type="submit" className="btn-primary w-full py-3 text-xs tracking-widest uppercase font-bold">Deploy Outlet</button>
                </form>
              </div>
            )}

            {outlets.length === 0 ? (
              <div className="border-2 border-dashed border-muted p-16 text-center">
                <p className="font-black text-xl uppercase text-gray-400">No Outlets Yet</p>
                <p className="font-mono text-xs text-gray-400 mt-2">Click "+ New Outlet" to deploy your first base.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {outlets.map(o => (
                  <button key={o.id} onClick={() => handleSelectOutlet(o)}
                    className="border-2 border-ink bg-white p-6 text-left hover:shadow-[6px_6px_0px_0px_rgba(33,186,177,1)] hover:-translate-y-0.5 transition-all group">
                    <div className="w-8 h-8 bg-primary flex items-center justify-center mb-4">
                      <span className="text-white font-black text-sm">{o.name.charAt(0)}</span>
                    </div>
                    <h3 className="font-black text-lg uppercase tracking-widest group-hover:text-primary transition-colors">{o.name}</h3>
                    <p className="font-mono text-[10px] text-gray-500 mt-2 uppercase">{o.manager_name}</p>
                    <p className="font-mono text-[10px] text-gray-400">{o.manager_phone}</p>
                    <p className="font-mono text-[9px] text-accent mt-4 uppercase tracking-widest">Click to open →</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── OUTLET DETAIL VIEW ── */}
        {activeTab === 'outlets' && selectedOutlet && (
          <div className="space-y-6 max-w-4xl">
            <button onClick={() => { setSelectedOutlet(null); setOutletStats(null); }}
              className="font-mono text-xs uppercase tracking-widest text-gray-500 hover:text-ink flex items-center gap-2">
              ← Back to All Outlets
            </button>

            {/* Header Card */}
            <div className="border-2 border-ink bg-white p-6 shadow-[6px_6px_0px_0px_rgba(33,186,177,1)]">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <p className="section-label mb-1">[ Outlet Detail ]</p>
                  <h2 className="font-black text-3xl uppercase tracking-widest text-primary">{selectedOutlet.name}</h2>
                </div>
                <div className="flex gap-2">
                  <a href={`tel:${selectedOutlet.manager_phone}`}
                    className="inline-flex items-center gap-1 bg-primary border-2 border-ink text-white px-4 py-2 text-[10px] font-bold hover:bg-black transition-colors">
                    📞 CALL {selectedOutlet.manager_name.split(' ')[0].toUpperCase()}
                  </a>
                  <button onClick={() => reassignManager(selectedOutlet.id)}
                    className="bg-red-500 border-2 border-ink text-white px-4 py-2 text-[10px] font-bold hover:bg-black transition-colors">
                    REASSIGN
                  </button>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4 border-t border-muted pt-4">
                <div>
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest">Commander</p>
                  <p className="font-bold text-sm mt-1">{selectedOutlet.manager_name}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest">Comm Link</p>
                  <p className="font-bold text-sm mt-1">{selectedOutlet.manager_phone}</p>
                </div>
              </div>
            </div>

            {/* Performance Stats */}
            <div className="border-2 border-ink bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="section-label mb-4">[ Performance Intelligence ]</p>
              {loadingStats ? (
                <p className="font-mono text-xs text-gray-400 animate-pulse">Decrypting intel...</p>
              ) : outletStats ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Feedback', value: outletStats.totalCust },
                    { label: 'Avg Rating', value: `${outletStats.avg}★`, color: 'text-primary' },
                    { label: 'Best Seller', value: outletStats.bestItem },
                    { label: 'Lead Staff', value: outletStats.leader },
                  ].map(s => (
                    <div key={s.label} className="border border-muted p-4 bg-paper">
                      <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-2">{s.label}</p>
                      <p className={`font-black text-lg ${s.color || 'text-ink'}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Daily Reports */}
            <div className="border-2 border-ink bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="section-label mb-4">[ Manager Daily Reports ]</p>
              {outletDailyReports.length === 0 ? (
                <p className="font-mono text-xs text-gray-400 py-4 text-center">No reports generated yet.</p>
              ) : (
                <div className="space-y-3">
                  {outletDailyReports.map(r => (
                    <div key={r.report_date} className="border border-muted bg-paper">
                      <button
                        onClick={() => setExpandedReport(expandedReport === r.report_date ? null : r.report_date)}
                        className="w-full flex justify-between items-center px-4 py-3 text-left hover:bg-white transition-colors">
                        <div>
                          <span className="font-black text-sm">{r.report_date}</span>
                          <span className="font-mono text-[9px] text-gray-400 ml-3 uppercase tracking-widest">
                            {new Date(r.report_date).toLocaleDateString('en-IN', { weekday: 'long' })}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-accent">{expandedReport === r.report_date ? '▲ Collapse' : '▼ Read'}</span>
                      </button>
                      {expandedReport === r.report_date && (
                        <div className="border-t border-muted px-4 py-4 prose prose-sm font-mono max-w-none prose-headings:font-black prose-headings:uppercase prose-p:text-[11px]">
                          <ReactMarkdown>{r.ai_content}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Admin Notes */}
            <div className="border-2 border-ink bg-white p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="section-label mb-4">[ Send Private Note ]</p>
              <p className="font-mono text-[10px] text-gray-400 mb-4">This note is private — only visible to the recipient when they log in.</p>
              <div className="space-y-3">
                <div>
                  <label className="form-label">Recipient</label>
                  <select
                    className="form-input w-full appearance-none bg-white font-mono text-sm"
                    value={noteTarget}
                    onChange={e => setNoteTarget(e.target.value)}>
                    <option value="manager">{selectedOutlet.manager_name} (Manager)</option>
                    {outletStaffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                    ))}
                  </select>
                </div>
                <textarea
                  rows={3}
                  placeholder="Write your note here..."
                  className="form-input w-full font-mono text-sm resize-none"
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                />
                <button onClick={handleSaveNote} disabled={savingNote || !noteText.trim()}
                  className="btn-primary px-6 py-2 text-xs font-bold tracking-widest uppercase disabled:opacity-40">
                  {savingNote ? 'Sending...' : 'Send Note'}
                </button>
              </div>

              {/* Existing Notes */}
              {outletNotes.length > 0 && (
                <div className="mt-6 space-y-2 border-t border-muted pt-4">
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest mb-3">Sent Notes</p>
                  {outletNotes.map(n => (
                    <div key={n.id} className="border border-muted p-3 bg-paper flex justify-between items-start gap-4">
                      <div>
                        <p className="font-bold text-xs uppercase text-accent">{n.target_name}</p>
                        <p className="font-mono text-[11px] text-ink mt-1">{n.note}</p>
                      </div>
                      <p className="font-mono text-[9px] text-gray-400 whitespace-nowrap">{new Date(n.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── MASTER INTEL TAB ── */}
        {activeTab === 'master intel' && (
          <div className="space-y-8 max-w-6xl">
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { type: 'daily', label: 'Daily Insights', period: '24H', color: 'border-ink' },
                { type: 'weekly', label: 'Weekly Strategy', period: '7D', color: 'border-primary' },
                { type: 'monthly', label: 'Monthly Overview', period: '30D', color: 'border-red-600 text-red-600' },
              ].map(cat => (
                <div key={cat.type} className="space-y-4">
                  <div className={`border-2 ${cat.color} bg-white p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
                    <p className="section-label mb-2 uppercase text-[9px]">{cat.label}</p>
                    <button onClick={() => generateMasterReport(cat.type)}
                      className="w-full btn-primary py-2 text-[10px] uppercase font-bold tracking-widest">
                      + Generate New
                    </button>
                  </div>

                  <div className="space-y-3">
                    {masterReportsHistory.filter(r => r.report_type === cat.type).map(r => (
                      <div key={r.id} className="border-2 border-ink bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group">
                        <button 
                          onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex justify-between items-center"
                        >
                          <div>
                            <p className="font-black text-xs">{r.period_start}</p>
                            <p className="font-mono text-[9px] text-gray-400 uppercase mt-0.5">Global Intel</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteMasterReport(r.id); }}
                                className="text-[9px] font-bold text-red-400 hover:text-red-600 transition-colors uppercase"
                            >
                                Delete
                            </button>
                            <span className="text-accent text-xs">{expandedReport === r.id ? '▲' : '▼'}</span>
                          </div>
                        </button>
                        {expandedReport === r.id && (
                          <div className="border-t border-muted p-4 bg-paper prose prose-sm font-mono max-w-none prose-p:text-[10px] prose-headings:text-[11px] prose-headings:uppercase prose-headings:font-black">
                            <ReactMarkdown>{r.ai_content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    ))}
                    {masterReportsHistory.filter(r => r.report_type === cat.type).length === 0 && (
                      <p className="font-mono text-[10px] text-gray-400 py-4 text-center border-2 border-dashed border-muted">No {cat.type} intel vaulted yet.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
