import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import StarRating from '../components/StarRating';
import FormInput from '../components/FormInput';
import toast, { Toaster } from 'react-hot-toast';

const INITIAL_FORM = { day_stars: 0, complaints: '', suggestions: '', feedback: '', others: '', target_employee_id: '' };

export default function StaffReport() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [colleagues, setColleagues] = useState([]);
  const [outletManager, setOutletManager] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [hasReportedToday, setHasReportedToday] = useState(false);
  const [myNotes, setMyNotes] = useState([]);
  
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  useEffect(() => {
    const raw = localStorage.getItem('revumate_user');
    if (!raw) { navigate('/login'); return; }
    
    const parsed = JSON.parse(raw);
    if (!parsed.outlet_id) { navigate('/login'); return; }
    
    setUser(parsed);
    loadOutletData(parsed);
  }, [navigate]);

  const loadOutletData = async (u) => {
    try {
      const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);

      const [staffReq, lockReq, pastReq, notesReq, outletReq] = await Promise.all([
        supabase.from('outlet_staff').select('id, name, role').eq('outlet_id', u.outlet_id).neq('id', u.id),
        supabase.from('staff_reports').select('id').eq('outlet_id', u.outlet_id).eq('is_manager_report', true).gte('created_at', startOfDay.toISOString()),
        supabase.from('staff_reports').select('id').eq('staff_id', u.id).gte('created_at', startOfDay.toISOString()),
        supabase.from('staff_notes').select('*').eq('target_phone', u.phone).order('created_at', { ascending: false }),
        supabase.from('outlets').select('manager_name, manager_phone').eq('id', u.outlet_id).maybeSingle()
      ]);

      if (staffReq.data) setColleagues(staffReq.data);
      if (outletReq.data) setOutletManager(outletReq.data);
      if (lockReq.data && lockReq.data.length > 0) setIsLocked(true);
      if (pastReq.data && pastReq.data.length > 0) setHasReportedToday(true);
      if (notesReq.data) setMyNotes(notesReq.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load outlet data.');
    }
  };

  const handle = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) { toast.error('Manager has already closed the day.'); return; }
    if (form.day_stars === 0) { toast.error('Please rate your day.'); return; }
    
    if (!form.complaints.trim()) { toast.error('Complaints field is mandatory (write "None" if none).'); return; }
    if (!form.feedback.trim()) { toast.error('Feedback is mandatory.'); return; }
    if (!form.suggestions.trim()) { toast.error('Suggestions are mandatory (write "None" if none).'); return; }
    if (!form.others.trim()) { toast.error('Others is mandatory.'); return; }

    setLoading(true);

    const isComplaintAboutManager = form.target_employee_id === '__manager__';

    const payload = {
      outlet_id: user.outlet_id,
      staff_id: user.id,
      name: user.name,
      phone: user.phone,
      day_stars: form.day_stars,
      complaints: isComplaintAboutManager
        ? `[ABOUT MANAGER: ${outletManager?.manager_name}] ${form.complaints}`
        : form.complaints,
      suggestions: form.suggestions,
      feedback: form.feedback,
      others: form.others,
      target_employee_id: isComplaintAboutManager ? null : (form.target_employee_id || null),
      is_manager_report: false
    };

    const { error } = await supabase.from('staff_reports').insert([payload]);
    
    setLoading(false);
    if (error) { toast.error('Something went wrong.'); console.error(error); }
    else setSubmitted(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('revumate_user');
    navigate('/login');
  };

  if (!user) return null;

  if (submitted) return <SuccessScreen name={user.name} onLogout={handleLogout} />;

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-center" />
      <header className="border-b border-ink bg-white flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent flex items-center justify-center">
            <span className="text-white font-black text-xs">Z</span>
          </div>
          <div>
            <p className="font-black text-xs tracking-[0.3em] uppercase">REVUMATE</p>
            <p className="font-mono text-[9px] tracking-widest text-gray-400 uppercase">Staff Daily Report</p>
          </div>
        </div>
        <div className="text-right flex items-center gap-4">
          <div className="hidden sm:block">
            <p className="font-mono text-[10px] text-gray-600">{today}</p>
            <p className="font-mono text-[9px] text-accent tracking-widest uppercase">End of Day</p>
          </div>
          <button onClick={handleLogout} className="btn-ghost text-xs px-3 py-1">Logout</button>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <p className="section-label mb-2">[ {user.role.toUpperCase()} ]</p>
            <h1 className="text-3xl font-black uppercase tracking-tight">DAILY<br/>WRAP-UP</h1>
            <p className="font-mono text-[11px] text-ink mt-2">Logged in as: <span className="font-bold">{user.name}</span></p>
            <div className="mt-3 h-1 w-10 bg-accent" />
          </div>

          {/* Notes from HQ */}
          {myNotes.length > 0 && (
            <div className="mb-6 border-2 border-accent bg-white shadow-[3px_3px_0px_0px_rgba(33,186,177,1)] p-4">
              <p className="text-[9px] font-bold uppercase tracking-widest text-accent mb-3">📩 Notes from HQ Admin</p>
              <div className="space-y-3">
                {myNotes.map(n => (
                  <div key={n.id} className="border-l-4 border-accent pl-3">
                    <p className="font-mono text-[11px] text-ink">{n.note}</p>
                    <p className="font-mono text-[9px] text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString('en-IN')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isLocked ? (
            <div className="border-2 border-red-600 bg-red-50 p-6 text-center shadow-[4px_4px_0px_0px_rgba(220,38,38,1)]">
              <h2 className="text-xl font-black text-red-700 uppercase mb-2">Day Closed 🔒</h2>
              <p className="font-mono text-[11px] text-red-800 leading-relaxed">
                Your Manager has already submitted the End of Day report.
                You can no longer submit a report for today.
              </p>
            </div>
          ) : hasReportedToday ? (
            <div className="border border-green-600 bg-green-50 p-6 text-center">
              <h2 className="text-xl font-black text-green-700 uppercase mb-2">Report Submitted ✓</h2>
              <p className="font-mono text-[11px] text-green-800 leading-relaxed">
                You have already completed your end-of-day wrap-up report for today.<br/>Great work, see you tomorrow!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="border border-accent p-4 bg-white">
                <label className="form-label">How was your day? <span className="text-primary">*</span></label>
                <StarRating value={form.day_stars} onChange={(v) => setForm((p) => ({ ...p, day_stars: v }))} size="lg" />
                {form.day_stars > 0 && (
                  <p className="font-mono text-[10px] text-gray-400 mt-2">
                    {['','Really tough 😔','A bit rough 😕','Just okay 😐','Pretty good 😊','Amazing! 🙌'][form.day_stars]}
                  </p>
                )}
              </div>

              <FormInput id="staff-feedback" label="General Feedback" required textarea rows={3} placeholder="Thoughts on today's operations..." value={form.feedback} onChange={handle('feedback')} />
              <FormInput id="suggestions" label="Suggestions for Improvement" required textarea rows={2} placeholder="Ideas to make things better... (write 'None' if none)" value={form.suggestions} onChange={handle('suggestions')} />
              
              <div className="border border-red-200 bg-red-50/50 p-4 space-y-4">
                <p className="section-label !text-red-500">[ Register Complaint ]</p>
                <div>
                  <label className="form-label">Employee to Report (Optional)</label>
                  <select 
                    className="form-input w-full appearance-none bg-white font-mono text-sm"
                    value={form.target_employee_id}
                    onChange={handle('target_employee_id')}
                  >
                    <option value="">-- No one --</option>
                    {/* Manager listed first */}
                    {outletManager && (
                      <option value="__manager__">
                        {outletManager.manager_name} (Manager) ⚠️
                      </option>
                    )}
                    {/* Colleagues */}
                    {colleagues.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
                    ))}
                  </select>
                </div>
                <FormInput id="complaints" label="Describe Issue" required textarea rows={2} placeholder="Customer incidents, employee friction... (write 'None' if none)" value={form.complaints} onChange={handle('complaints')} />
              </div>

              <FormInput id="others" label="Anything Else?" required textarea rows={2} placeholder="Any other notes... (write 'None' if none)" value={form.others} onChange={handle('others')} />

              <button type="submit" disabled={loading} className="btn-accent w-full mt-3 py-4 text-sm">
                {loading ? 'Submitting...' : '→ Submit Daily Report'}
              </button>
            </form>
          )}
        </div>
      </main>
      <footer className="border-t border-ink bg-white px-6 py-3 text-center">
        <p className="font-mono text-[9px] tracking-widest text-gray-400 uppercase">REVUMATE © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

function SuccessScreen({ name, onLogout }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-8 bg-paper">
      <div className="border-2 border-accent p-8 bg-white max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(33,186,177,1)]">
        <div className="w-12 h-12 bg-accent flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="section-label mb-2">[ Submitted ]</p>
        <h2 className="text-2xl font-black uppercase">Report Saved!</h2>
        <p className="font-mono text-[11px] text-gray-500 mt-2">
          Great work today, {name}! See you tomorrow. 🎉
        </p>
        <button onClick={onLogout} className="btn-ghost w-full px-4 py-2 mt-6 uppercase text-xs tracking-widest border border-ink">Disconnect</button>
      </div>
    </div>
  );
}
