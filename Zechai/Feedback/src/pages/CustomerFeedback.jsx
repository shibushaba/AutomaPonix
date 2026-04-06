import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import StarRating from '../components/StarRating';
import FormInput from '../components/FormInput';
import Confetti from '../components/Confetti';
import toast, { Toaster } from 'react-hot-toast';

import { useSearchParams } from 'react-router-dom';

const INITIAL = { name: '', phone: '', stars: 0, feedback_msg: '', item_ordered: '', suggestion: '' };

export default function CustomerFeedback() {
  const [searchParams] = useSearchParams();
  const outletId = searchParams.get('outlet_id') || searchParams.get('outlet');

  const [form, setForm] = useState(INITIAL);
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [returning, setReturning] = useState(null); // null | { name, count }
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [fireConfetti, setFireConfetti]   = useState(false);

  const handle = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  // Check if returning customer when phone has 10+ digits
  useEffect(() => {
    const trimmed = form.phone.replace(/\D/g, '');
    if (trimmed.length < 10) { setReturning(null); return; }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setCheckingPhone(true);
      const { data } = await supabase
        .from('customer_feedback')
        .select('name, phone')
        .eq('phone', form.phone.trim())
        .order('created_at', { ascending: false });
      if (!cancelled) {
        setCheckingPhone(false);
        if (data && data.length > 0) {
          setReturning({ name: data[0].name, count: data.length });
          setFireConfetti(true);
          if (!form.name) setForm((p) => ({ ...p, name: data[0].name }));
        } else {
          setReturning(null);
          setFireConfetti(false);
        }
      }
    }, 700);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [form.phone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.stars === 0) { toast.error('Please select a rating.'); return; }
    
    // Strict validation
    if (!form.item_ordered.trim()) { toast.error('Item Ordered is mandatory.'); return; }
    if (!form.feedback_msg.trim()) { toast.error('Feedback message is mandatory.'); return; }
    if (!form.suggestion.trim()) { toast.error('Suggestion is mandatory.'); return; }

    setLoading(true);
    const payload = {
      name: form.name.trim() || 'Anonymous', 
      phone: form.phone.trim() || null, 
      stars: form.stars,
      feedback_msg: form.feedback_msg, 
      item_ordered: form.item_ordered, 
      suggestion: form.suggestion,
    };
    if (outletId) payload.outlet_id = outletId;

    const { error } = await supabase.from('customer_feedback').insert([payload]);
    setLoading(false);
    if (error) { toast.error('Something went wrong. Please try again.'); console.error(error); }
    else setSubmitted(true);
  };

  if (submitted) return <SuccessScreen onNew={() => { setSubmitted(false); setForm(INITIAL); setReturning(null); setFireConfetti(false); }} />;

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster position="top-center" />
      <Confetti trigger={fireConfetti} />

      {/* Header */}
      <header className="border-b border-ink bg-white flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary flex items-center justify-center">
            <span className="text-white font-black text-xs">Z</span>
          </div>
          <div>
            <p className="font-black text-xs tracking-[0.3em] uppercase">REVUMATE</p>
            <p className="font-mono text-[9px] tracking-widest text-gray-400 uppercase">Customer Feedback</p>
          </div>
        </div>
        <span className="badge badge-primary hidden sm:inline-block">[ Customer ]</span>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">

          {/* Returning customer banner */}
          {returning && (
            <div className="mb-6 border border-primary bg-white p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-primary flex-shrink-0 flex items-center justify-center mt-0.5">
                <span className="text-white text-sm">👋</span>
              </div>
              <div>
                <p className="font-black text-sm uppercase tracking-wide text-ink">
                  Welcome back, {returning.name}!
                </p>
                <p className="font-mono text-[10px] text-gray-500 mt-0.5">
                  Visit #{returning.count + 1} · We're glad to see you again.
                </p>
              </div>
            </div>
          )}

          <div className="mb-8">
            <p className="section-label mb-2">[ Your Experience ]</p>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              HOW WAS<br/>YOUR VISIT?
            </h1>
            <div className="mt-3 h-1 w-10 bg-primary" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FormInput id="item_ordered" label="Item(s) Ordered" required placeholder="e.g. Caramel Latte, Croissant..." value={form.item_ordered} onChange={handle('item_ordered')} />

            <div className="border border-ink p-4 bg-white">
              <label className="form-label">Overall Rating <span className="text-primary">*</span></label>
              <StarRating value={form.stars} onChange={(v) => setForm((p) => ({ ...p, stars: v }))} size="lg" />
              {form.stars > 0 && (
                <p className="font-mono text-[10px] text-gray-400 mt-2">
                  {['','Poor','Fair','Good','Great','Excellent! 🤩'][form.stars]}
                </p>
              )}
            </div>

            <FormInput id="feedback_msg" label="Your Feedback" required textarea rows={3} placeholder="Tell us about your experience..." value={form.feedback_msg} onChange={handle('feedback_msg')} />
            <FormInput id="suggestion" label="Suggestions" required textarea rows={2} placeholder="What can we improve?" value={form.suggestion} onChange={handle('suggestion')} />

            <div className="mt-8 pt-6 border-t border-ink border-dashed">
              <p className="section-label mb-4">[ Optional Caller ID ]</p>
              <div className="grid grid-cols-2 gap-4">
                <FormInput id="name" label="Your Name (Optional)" placeholder="Alex..." value={form.name} onChange={handle('name')} />
                <div>
                  <FormInput id="phone" label="Phone (Optional)" type="tel" placeholder="+91 999 999 999" value={form.phone} onChange={handle('phone')} />
                  {checkingPhone && <p className="font-mono text-[9px] text-gray-400 mt-1">Checking...</p>}
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full mt-3 py-4 text-sm">
              {loading ? 'Submitting...' : '→ Submit Feedback'}
            </button>
          </form>
        </div>
      </main>

      <footer className="border-t border-ink bg-white px-6 py-3 text-center">
        <p className="font-mono text-[9px] tracking-widest text-gray-400 uppercase">REVUMATE © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

function SuccessScreen({ onNew }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-8">
      <div className="border border-primary p-8 bg-white max-w-sm w-full">
        <div className="w-12 h-12 bg-primary flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="section-label mb-2">[ Received ]</p>
        <h2 className="text-2xl font-black uppercase">Thank You!</h2>
        <p className="font-mono text-[11px] text-gray-500 mt-2">
          Your feedback helps us brew a better experience every single day.
        </p>
        <button onClick={onNew} className="btn-primary w-full mt-6">→ Submit Another</button>
      </div>
    </div>
  );
}
