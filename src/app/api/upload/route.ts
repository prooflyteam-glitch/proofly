import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { Readable } from 'stream';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1. Initialize OAuth Client with MASTER credentials
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('video') as File;
    const ratingStr = formData.get('rating');
    const merchantEmail = formData.get('merchant_email');
    const rating = ratingStr ? parseInt(ratingStr.toString(), 10) : 5;
    
    if (!file || !merchantEmail) {
      return NextResponse.json({ error: 'Missing video or merchant info' }, { status: 400 });
    }

    // 2. Initialize Drive API using the Master OAuth client
    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // 3. Convert video file to a readable stream
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // 4. Upload to the Master Google Drive
    const driveResponse = await drive.files.create({
      requestBody: {
        name: `Review_${Date.now()}_${file.name}`,
        mimeType: file.type,
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: 'id',
    });

    const googleFileId = driveResponse.data.id;

    if (!googleFileId) throw new Error('Google Drive upload failed');

    // 5. Log the review into your database (linked to the merchant, but stored in your Master Drive)
    const { error: dbError } = await supabase
      .from('reviews')
      .insert([
        { 
          google_file_id: googleFileId, 
          status: 'pending',
          rating: rating,
          merchant_email: merchantEmail
        }
      ]);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, fileId: googleFileId });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Failed to upload video' }, { status: 500 });
  }
}
