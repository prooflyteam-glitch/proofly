import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

// 1. Initialize OAuth Client with your Master credentials
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get('fileId');

  if (!fileId) {
    return NextResponse.json({ error: 'Missing fileId parameter' }, { status: 400 });
  }

  try {
    // 2. Stream the video file directly from your Master Google Drive account
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // 3. Pipe the stream directly back to the client
    return new NextResponse(response.data as any, {
      headers: {
        'Content-Type': 'video/mp4', // Forces browser to treat it as video
        'Cache-Control': 'public, max-age=31536000', // Cache for speed
      },
    });
  } catch (error: any) {
    console.error('Streaming Error:', error);
    return NextResponse.json({ error: 'Failed to stream video' }, { status: 500 });
  }
}
