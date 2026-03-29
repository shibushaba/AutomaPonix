import { useState } from 'react';
import { supabase } from '../lib/supabase';
import StarRating from '../components/StarRating';
import FormInput from '../components/FormInput';
import toast, { Toaster } from 'react-hot-toast';

const INITIAL_FORM = { name: '', phone: '', day_stars: 0, complaints: '', suggestions: '', feedback: '', others: '' };

export default function StaffReport() {
  const [mode, setMode]           = useState('gate'); // 'gate' | 'login' | 'form'
  const [loginCreds, setLoginCreds] = useState({ name: '', phone: '' });
  const [staffInfo, setStaffInfo] = useState(null); // { name, phone, reportCount, achievements }
  const [form, setForm]           = useState(INITIAL_FORM);
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const handle = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  // Check if staff exists (returning staff login)
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data } = await supabase
      .from('staff_reports')
      .select('name, phone, created_at')
      .eq('phone', loginCreds.phone.trim())
      .eq('name', loginCreds.name.trim());
    setLoading(false);
    if (data && data.length > 0) {
      // Get achievements & marks
      const phone = loginCreds.phone.trim();
      const name = loginCreds.name.trim();

      const { data: ach } = await supabase.from('staff_achievements')
        .select('*').or(`staff_phone.eq.${phone},staff_name.eq.${name}`);
      
      const { data: marksData } = await supabase.from('staff_marks')
        .select('*').or(`staff_phone.eq.${phone},staff_name.eq.${name}`)
        .order('date', { ascending: false });

      // Check if reported today
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      const hasReportedToday = data.some(r => new Date(r.created_at) >= startOfDay);

      setStaffInfo({ 
        name, phone, 
        reportCount: data.length, 
        achievements: ach || [],
        marks: marksData || [],
        hasReportedToday
      });
      setForm((p) => ({ ...p, name: loginCreds.name.trim(), phone: loginCreds.phone.trim() }));
      setMode('form');
    } else {
      toast.error('No record found. If new, please fill the form directly.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.day_stars === 0) { toast.error('Please rate your day.'); return; }
    
    // Strict validation
    if (!form.name.trim()) { toast.error('Name is mandatory.'); return; }
    if (!form.phone.trim()) { toast.error('Phone is mandatory.'); return; }
    if (!form.complaints.trim()) { toast.error('Complaints field is mandatory (write "None" if none).'); return; }
    if (!form.feedback.trim()) { toast.error('Feedback is mandatory.'); return; }
    if (!form.suggestions.trim()) { toast.error('Suggestions are mandatory (write "None" if none).'); return; }
    if (!form.others.trim()) { toast.error('Others is mandatory (write "None" if none).'); return; }

    setLoading(true);

    // Double check if already reported (especially for New Staff flow bypassing login gate)
    const phone = form.phone.trim();
    const name = form.name.trim();
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const { data: existing } = await supabase.from('staff_reports')
      .select('id')
      .or(`phone.eq.${phone},name.eq.${name}`)
      .gte('created_at', startOfDay.toISOString());

    if (existing && existing.length > 0) {
      toast.error('You have already submitted a report today!');
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('staff_reports').insert([{
      name: form.name, phone: form.phone, day_stars: form.day_stars,
      complaints: form.complaints, suggestions: form.suggestions, feedback: form.feedback, others: form.others,
    }]);
    setLoading(false);
    if (error) { toast.error('Something went wrong.'); console.error(error); }
    else setSubmitted(true);
  };

  if (submitted) return <SuccessScreen name={form.name} onNew={() => { setSubmitted(false); setForm(INITIAL_FORM); setMode('gate'); setStaffInfo(null); }} />;

  // Gate screen
  if (mode === 'gate') return (
    <GateScreen
      today={today}
      onNewStaff={() => setMode('form')}
      onReturning={() => setMode('login')}
    />
  );

  // Login screen
  if (mode === 'login') return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-center" />
      <StaffHeader today={today} />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <p className="section-label mb-2">[ Returning Staff ]</p>
          <h2 className="text-2xl font-black uppercase mb-6">Sign In</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <FormInput id="login-name" label="Your Name" required placeholder="As submitted before" value={loginCreds.name} onChange={(e) => setLoginCreds((p) => ({ ...p, name: e.target.value }))} />
            <FormInput id="login-phone" label="Phone (Password)" type="tel" required placeholder="+91 99999 99999" value={loginCreds.phone} onChange={(e) => setLoginCreds((p) => ({ ...p, phone: e.target.value }))} hint="Your phone number is your password" />
            <button type="submit" disabled={loading} className="btn-accent w-full py-3">{loading ? 'Verifying...' : '→ Sign In'}</button>
            <button type="button" onClick={() => setMode('gate')} className="btn-ghost w-full py-2 text-xs">← Back</button>
          </form>
        </div>
      </main>
    </div>
  );

  // Report form
  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-center" />
      <StaffHeader today={today} />
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">

          {/* Staff profile card if logged in */}
          {staffInfo && (
            <div className="mb-8 space-y-4">
              <div className="border border-accent p-4 bg-white flex items-start gap-4">
                <div className="w-10 h-10 bg-accent flex-shrink-0 flex items-center justify-center">
                  <span className="text-white font-black">{staffInfo.name.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm uppercase">{staffInfo.name}</p>
                  <p className="font-mono text-[10px] text-gray-400">{staffInfo.reportCount} reports submitted</p>
                  
                  {staffInfo.marks?.length > 0 && (
                     <p className="font-mono text-[10px] text-ink mt-1">Avg Admin Rank: <span className="font-bold">{(staffInfo.marks.reduce((a,r) => a+r.mark, 0) / staffInfo.marks.length).toFixed(1)}/10</span></p>
                  )}

                  {staffInfo.achievements?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {staffInfo.achievements.map((a, i) => (
                        <span key={i} className="badge badge-ink text-[9px] bg-ink text-white px-2 py-0.5" title={`${a.month}/${a.year}`}>🏆 {a.title}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Show Recent Marks Given by Admin */}
              {staffInfo.marks?.length > 0 && (
                <div className="border border-ink bg-white p-4">
                  <p className="section-label mb-3">[ Admin Feedback ]</p>
                  <div className="space-y-2">
                    {staffInfo.marks.slice(0, 3).map((m, i) => (
                      <div key={i} className="flex justify-between items-center border border-muted px-2 py-2 bg-paper">
                        <div>
                          <p className="font-mono text-[9px] text-gray-500 uppercase">{m.date}</p>
                          {m.admin_note && <p className="font-mono text-[11px] text-ink mt-1 font-semibold">{m.admin_note}</p>}
                        </div>
                        <p className="font-black text-lg">{m.mark}<span className="text-xs opacity-50">/10</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-8">
            <p className="section-label mb-2">[ End of Day ]</p>
            <h1 className="text-3xl font-black uppercase tracking-tight">DAILY<br/>WRAP-UP</h1>
            <div className="mt-3 h-1 w-10 bg-accent" />
          </div>

          {staffInfo?.hasReportedToday ? (
            <div className="border border-green-600 bg-green-50 p-6 text-center">
              <h2 className="text-xl font-black text-green-700 uppercase mb-2">Report Submitted ✓</h2>
              <p className="font-mono text-[11px] text-green-800 leading-relaxed">
                You have already completed your end-of-day wrap-up report for today.<br/>Great work, see you tomorrow!
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!staffInfo && (
                <div className="grid grid-cols-2 gap-4">
                  <FormInput id="staff-name" label="Your Name" required placeholder="Name..." value={form.name} onChange={handle('name')} />
                  <FormInput id="staff-phone" label="Phone Number" type="tel" placeholder="+91..." value={form.phone} onChange={handle('phone')} hint="Becomes your login password" />
                </div>
              )}

              <div className="border border-accent p-4 bg-white">
                <label className="form-label">How was your day? <span className="text-primary">*</span></label>
                <StarRating value={form.day_stars} onChange={(v) => setForm((p) => ({ ...p, day_stars: v }))} size="lg" />
                {form.day_stars > 0 && (
                  <p className="font-mono text-[10px] text-gray-400 mt-2">
                    {['','Really tough 😔','A bit rough 😕','Just okay 😐','Pretty good 😊','Amazing! 🙌'][form.day_stars]}
                  </p>
                )}
              </div>

              <FormInput id="complaints" label="Complaints / Issues Today?" required textarea rows={3} placeholder="Equipment issues, customer incidents... (write 'None' if none)" value={form.complaints} onChange={handle('complaints')} />
              <FormInput id="staff-feedback" label="General Feedback" required textarea rows={3} placeholder="Thoughts on today's operations..." value={form.feedback} onChange={handle('feedback')} />
              <FormInput id="suggestions" label="Suggestions for Improvement" required textarea rows={2} placeholder="Ideas to make things better... (write 'None' if none)" value={form.suggestions} onChange={handle('suggestions')} />
              <FormInput id="others" label="Anything Else?" required textarea rows={2} placeholder="Any other notes... (write 'None' if none)" value={form.others} onChange={handle('others')} />

              <button type="submit" disabled={loading} className="btn-accent w-full mt-3 py-4 text-sm">
                {loading ? 'Submitting...' : '→ Submit Daily Report'}
              </button>
            </form>
          )}
        </div>
      </main>
      <footer className="border-t border-ink bg-white px-6 py-3 text-center">
        <p className="font-mono text-[9px] tracking-widest text-gray-400 uppercase">ZECHAI © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

function StaffHeader({ today }) {
  return (
    <header className="border-b border-ink bg-white flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-accent flex items-center justify-center">
          <span className="text-white font-black text-xs">Z</span>
        </div>
        <div>
          <p className="font-black text-xs tracking-[0.3em] uppercase">ZECHAI</p>
          <p className="font-mono text-[9px] tracking-widest text-gray-400 uppercase">Staff Daily Report</p>
        </div>
      </div>
      <div className="text-right hidden sm:block">
        <p className="font-mono text-[10px] text-gray-600">{today}</p>
        <p className="font-mono text-[9px] text-accent tracking-widest uppercase">End of Day</p>
      </div>
    </header>
  );
}

function GateScreen({ today, onNewStaff, onReturning }) {
  return (
    <div className="min-h-screen flex flex-col">
      <StaffHeader today={today} />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <p className="section-label mb-2">[ Staff Portal ]</p>
          <h1 className="text-3xl font-black uppercase tracking-tight mb-8">
            WELCOME<br/>BACK!
          </h1>
          <div className="space-y-3">
            <button onClick={onReturning} className="btn-accent w-full py-4">
              → Sign In (Returning Staff)
            </button>
            <button onClick={onNewStaff} className="btn-ghost w-full py-4">
              + First Time — Fill Report
            </button>
          </div>
          <p className="font-mono text-[10px] text-gray-400 mt-6 text-center">
            First time? Your phone number becomes your login password after your first report.
          </p>
        </div>
      </main>
    </div>
  );
}

function SuccessScreen({ name, onNew }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-8">
      <div className="border border-accent p-8 bg-white max-w-sm w-full">
        <div className="w-12 h-12 bg-accent flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="section-label mb-2">[ Submitted ]</p>
        <h2 className="text-2xl font-black uppercase">Report Saved!</h2>
        <p className="font-mono text-[11px] text-gray-500 mt-2">
          Great work today{name ? `, ${name}` : ''}! See you tomorrow. 🎉
        </p>
        <button onClick={onNew} className="btn-accent w-full mt-6">→ Submit Another</button>
      </div>
    </div>
  );
}
