import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import FormInput from '../components/FormInput';
import toast, { Toaster } from 'react-hot-toast';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone) { toast.error('Enter your registered phone number'); return; }

    setLoading(true);
    const cleanPhone = phone.trim();

    try {
      // 1. Check if Manager
      const { data: outletData } = await supabase
        .from('outlets')
        .select('*')
        .eq('manager_phone', cleanPhone)
        .maybeSingle();

      if (outletData) {
        localStorage.setItem('revumate_user', JSON.stringify({
          role: 'manager',
          outlet_id: outletData.id,
          name: outletData.manager_name,
          phone: outletData.manager_phone
        }));
        setLoading(false);
        toast.success(`Welcome back, ${outletData.manager_name}`);
        navigate('/manager');
        return;
      }

      // 2. Check if Staff
      const { data: staffData } = await supabase
        .from('outlet_staff')
        .select('id, outlet_id, name, phone, role')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (staffData) {
        localStorage.setItem('revumate_user', JSON.stringify({
          role: staffData.role,
          id: staffData.id,
          outlet_id: staffData.outlet_id,
          name: staffData.name,
          phone: staffData.phone
        }));
        setLoading(false);
        toast.success(`Welcome back, ${staffData.name}`);
        navigate('/staff');
        return;
      }

      // 3. Not found
      toast.error('Number not registered. Contact your manager.', { id: 'auth' });
      setLoading(false);

    } catch (err) {
      console.error(err);
      toast.error('Network error during login.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-paper">
      <Toaster position="top-center" />
      <div className="w-full max-w-sm border-2 border-ink p-8 bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="w-12 h-12 bg-primary flex items-center justify-center mb-6">
          <span className="text-white font-black text-xl">Z</span>
        </div>
        <h1 className="text-3xl font-black uppercase mb-2">Team Login</h1>
        <p className="font-mono text-[10px] text-gray-500 uppercase tracking-widest mb-8">
          Access your daily operations
        </p>

        <form onSubmit={handleLogin} className="space-y-6">
          <FormInput 
            id="phone" 
            label="Registered Phone Number" 
            required 
            type="tel" 
            placeholder="+91 99999 99999" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
          />
          <button type="submit" disabled={loading} className="btn-primary w-full py-4 uppercase font-bold tracking-widest text-sm">
            {loading ? 'Authenticating...' : 'Enter Door'}
          </button>
        </form>
      </div>
    </div>
  );
}
