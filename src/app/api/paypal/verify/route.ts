import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { orderID, merchantEmail } = await request.json();

    // 1. Get an access token from PayPal (Production URL)
    const auth = Buffer.from(`${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    const { access_token } = await tokenRes.json();

    // 2. Verify the order with PayPal (Production URL)
    const orderRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderID}`, {
      headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const orderData = await orderRes.json();

    // 3. Check if payment is complete and it's exactly $29
    if (orderData.status === 'COMPLETED' && orderData.purchase_units[0].amount.value === '29.00') {
      
      // 4. Update the database to permanently unlock the app
      const { error } = await supabase
        .from('merchant_profiles')
        .upsert({ email: merchantEmail, has_paid: true });

      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Payment not completed or invalid amount' }, { status: 400 });
  } catch (error) {
    console.error('PayPal Verify Error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
