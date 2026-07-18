import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const body = await request.json();
    
    // 1. Smart Extraction: Check URL parameters first, then check the JSON body
    const merchant_email = searchParams.get('merchant') || body.merchant_email;
    
    // Shopify sends the domain in the headers, or we grab it from the URL/body
    const store_name = searchParams.get('store_name') || body.store_name || request.headers.get('x-shopify-shop-domain');

    // 2. Data Mapping: Check for custom keys, then fallback to Shopify's native keys
    const customer_email = body.customer_email || body.email; 
    const customer_name = body.customer_name || body.customer?.first_name || 'there';
    
    // Shopify stores the purchased item in an array called line_items
    const product_id = body.product_id || body.line_items?.[0]?.product_id;

    // 3. Validation
    if (!customer_email || !product_id || !store_name || !merchant_email) {
      return NextResponse.json({ error: 'Missing required order details or merchant context' }, { status: 400 });
    }

    // 4. Queue for 72 hours
    const sendAt = new Date();
    sendAt.setDate(sendAt.getDate() + 3);

    const { error } = await supabase
      .from('email_queue')
      .insert([
        {
          customer_email,
          customer_name,
          product_id,
          store_name,
          merchant_email,
          send_at: sendAt.toISOString(),
          status: 'pending'
        }
      ]);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Review email queued.' });
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
