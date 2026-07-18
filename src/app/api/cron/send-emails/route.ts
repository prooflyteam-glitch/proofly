import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const now = new Date().toISOString();

    // 1. Grab pending emails that are due
    const { data: queue, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('send_at', now);

    if (fetchError) throw fetchError;

    if (!queue || queue.length === 0) {
      return NextResponse.json({ message: 'No emails due for sending.' });
    }

    // 2. Set up the Gmail Robot
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // 3. Loop through and send
    for (const item of queue) {
      // FIX: Pointing to production and dynamically embedding the merchant's email context
      const submitLink = `https://proofly.vercel.app/submit?productId=${item.product_id}&store=${encodeURIComponent(item.merchant_email)}`;
      
      const emailHtml = `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
          <h2>How was your experience, ${item.customer_name}?</h2>
          <p>Please share your review with us by recording a short video and submitting it here:</p>
          <a href="${submitLink}" style="display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 15px 0;">
            Record Video Review
          </a>
          <p>Thank you,<br><strong>${item.store_name}</strong> - Proofly</p>
        </div>
      `;

      try {
        // Tell Gmail to send it
        await transporter.sendMail({
          from: `"Proofly Reviews" <${process.env.GMAIL_USER}>`,
          to: item.customer_email,
          subject: `How was your experience with ${item.store_name}?`,
          html: emailHtml,
        });

        // Mark as sent in Supabase
        await supabase.from('email_queue').update({ status: 'sent' }).eq('id', item.id);
      } catch (mailError) {
        console.error(`Failed to send to ${item.customer_email}`, mailError);
        await supabase.from('email_queue').update({ status: 'failed' }).eq('id', item.id);
      }
    }

    return NextResponse.json({ success: true, processedCount: queue.length });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: 'Failed executing mailer' }, { status: 500 });
  }
}
