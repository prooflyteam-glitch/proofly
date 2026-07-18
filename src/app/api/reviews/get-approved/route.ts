import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase using service role to bypass any strict read RLS policies for public widget access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // 1. Grab the product ID from the incoming widget request URL
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json(
        { error: 'Missing productId parameter' },
        { status: 400 }
      );
    }

    // 2. Query the database for reviews tied to this product that are explicitly flagged as approved/published
    // We select 'google_file_id' as 'google_drive_file_id' and 'rating' to feed our proofly.js script perfectly.
    const { data: reviews, error } = await supabase
      .from('reviews')
      .select('id, google_file_id, rating, status')
      .eq('product_id', productId)
      .eq('status', 'approved') // Ensures unmoderated or hidden videos don't leak to the storefront
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase fetch error:', error);
      throw error;
    }

    // 3. Map the fields to match the naming convention expected by your frontend public/proofly.js script
    const formattedReviews = (reviews || []).map((review) => ({
      id: review.id,
      google_drive_file_id: review.google_file_id,
      rating: review.rating,
    }));

    // 4. Return the payload with strict CORS headers so any merchant store domain can read it safely
    return new NextResponse(
      JSON.stringify({ reviews: formattedReviews }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Allows execution on external Shopify/WooCommerce/Custom domains
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error: any) {
    console.error('Widget Fetch Route Error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
}

// Handle preflight CORS requests gracefully
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
