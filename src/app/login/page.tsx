'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

 const handleAuth = async (type: 'login' | 'signup') => {
    if (!email.trim() || !password.trim()) {
      alert('Please enter both an email and a password.');
      return;
    }

    setLoading(true);

    if (type === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else {
        // Create an initial unpaid profile record
        await supabase.from('merchant_profiles').insert([{ email, has_paid: false }]);
        alert('Account created! Please sign in.');
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        alert(error.message);
      } else {
        // Check if they have paid
        const { data: profile } = await supabase
          .from('merchant_profiles')
          .select('has_paid')
          .eq('email', email)
          .single();

        router.refresh(); 
        
        if (profile?.has_paid) {
          router.push('/dashboard'); // Skip payment, go straight to app
        } else {
          router.push('/checkout');  // Blocked, go to payment gate
        }
      }
    }
    setLoading(false);
  };
  
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#FAFAFA]">
      <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6">Welcome to Proofly</h1>
        {/* Added onSubmit override to stop native form reloads */}
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            className="w-full p-3 rounded-xl border border-black/10 text-black"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            className="w-full p-3 rounded-xl border border-black/10 text-black"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button 
            type="button" 
            onClick={() => handleAuth('login')}
            className="bg-black text-white py-3 rounded-xl font-medium active:scale-95 transition-transform"
          >
            {loading ? 'Processing...' : 'Sign In'}
          </button>
          <button 
            type="button" 
            onClick={() => handleAuth('signup')}
            className="text-sm text-black/50 hover:text-black mt-2"
          >
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}
