'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CheckoutPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setEmail(user.email!);
      }
    }
    checkAuth();
  }, [router]);

  if (!email) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 text-[#1D1D1F]">
      <div className="bg-white p-8 rounded-3xl border border-black/5 shadow-sm w-full max-w-md text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Unlock Proofly</h1>
        <p className="text-black/60 mb-8">One-time payment of $29. Full lifetime access. Zero monthly fees.</p>

        <PayPalScriptProvider options={{ "clientId": process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!, currency: "USD" }}>
          <PayPalButtons 
            style={{ layout: "vertical", shape: "rect", color: "black" }}
            createOrder={(data, actions) => {
              return actions.order.create({
                purchase_units: [{
                  amount: { currency_code: "USD", value: "29.00" },
                  description: "Proofly Lifetime Deal"
                }]
              });
            }}
            onApprove={async (data, actions) => {
              // Send to our backend to verify securely
              const response = await fetch('/api/paypal/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  orderID: data.orderID,
                  merchantEmail: email
                })
              });
              
              if (response.ok) {
                router.push('/dashboard');
              } else {
                alert('Payment verification failed. Please contact support.');
              }
            }}
          />
        </PayPalScriptProvider>
      </div>
    </main>
  );
}
