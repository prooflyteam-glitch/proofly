import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // 1. Grab the merchant's email from the URL request
  const { searchParams } = new URL(request.url);
  const merchantEmail = searchParams.get('merchant');

  if (!merchantEmail) {
    return NextResponse.json({ error: 'Merchant email is required to connect Drive' }, { status: 400 });
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:3000/api/auth/google/callback'
  );

  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/userinfo.email',
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', 
    scope: scopes,
    prompt: 'consent',
    // 2. Attach the merchant email to the Google request!
    state: merchantEmail, 
  });

  return NextResponse.redirect(url);
}
