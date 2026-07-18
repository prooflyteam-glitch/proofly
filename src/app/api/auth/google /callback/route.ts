import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  
  // 1. Retrieve the merchant's email that Google passed back to us
  const merchantEmail = searchParams.get('state'); 

  if (!code) {
    return NextResponse.json({ error: 'Authorization code missing' }, { status: 400 });
  }

  if (!merchantEmail) {
    return NextResponse.json({ error: 'Merchant state mapping missing' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/api/auth/google/callback'
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    // 2. Securely save the tokens using the verified merchantEmail from our state
    const { error } = await supabase
      .from('google_credentials')
      .upsert({
        merchant_email: merchantEmail, 
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token, 
        expiry_date: tokens.expiry_date,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'merchant_email' });

    if (error) throw error;

    // Send them back to the dashboard victoriously
    return NextResponse.redirect(new URL('/dashboard?success=true', request.url));
  } catch (error) {
    console.error('Database save error:', error);
    return NextResponse.redirect(new URL('/dashboard?error=failed', request.url));
  }
}
