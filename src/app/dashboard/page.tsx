'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize our public Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Review {
  id: string;
  created_at: string;
  google_file_id: string;
  rating: number;
  status: string;
  product_id: string;
}

export default function DashboardPage() {
  const router = useRouter(); 
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  
  // NEW: State to track if the user has passed the paywall check
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Fetch live metrics, check authorization, & load reviews from Supabase
  async function fetchDashboardData() {
    try {
      // 1. Authenticate User
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !user.email) {
        router.push('/login');
        return;
      }

      const merchantEmail = user.email;

      // 2. The Bouncer: Check payment status in merchant_profiles
      const { data: profile, error: profileError } = await supabase
        .from('merchant_profiles')
        .select('has_paid')
        .eq('email', merchantEmail)
        .single();

      // If no profile exists (e.g., direct email link) or they haven't paid, boot them
      if (profileError || !profile || !profile.has_paid) {
        router.push('/checkout');
        return; // Stop fetching and redirect immediately
      }

      // They passed the check!
      setIsAuthorized(true);

      // 3. Fetch Reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('*')
        .eq('merchant_email', merchantEmail) 
        .order('created_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, [router]);

  // Handle live toggle status updates (Approve/Hide)
  const toggleReviewStatus = async (reviewId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'approved' ? 'pending' : 'approved';
    
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ status: newStatus })
        .eq('id', reviewId);

      if (error) throw error;
      
      // Update local state instantly so the UI feels fast and crisp
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Error updating review status.');
    }
  };

  // Calculate Live Metrics dynamically
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? (reviews.reduce((acc, item) => acc + item.rating, 0) / totalReviews).toFixed(1)
    : '0.0';

  // NEW: Show loading screen while verifying payment status
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] text-[#1D1D1F]">
        <p className="animate-pulse font-medium text-black/60">Verifying secure access...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-[#1D1D1F] p-6 md:p-12 font-sans">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proofly Hub</h1>
          <p className="text-black/50 text-sm mt-1">Real-time authentic video social proof.</p>
        </div>
        
        {/* System Status Indicator */}
        <div className="bg-blue-50 text-blue-700 text-xs font-semibold px-4 py-2 rounded-full border border-blue-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          System Active
        </div>
      </header>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: STATS & INTEGRATION CODES */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          
          {/* Stats Box */}
          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40">Overview</h3>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-3xl font-bold tracking-tight">{totalReviews}</p>
                <p className="text-xs text-black/50 mt-1">Total Reviews</p>
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight text-amber-500">★ {averageRating}</p>
                <p className="text-xs text-black/50 mt-1">Average Rating</p>
              </div>
            </div>
          </div>

          {/* Integration Copy-Paste Code */}
          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40 mb-3">Install Widget</h3>
            <p className="text-xs text-black/60 mb-4">
              Paste this single-line script inside your store's global header to instantly activate auto-play review widgets on your product pages.
            </p>
            <div className="relative bg-black/5 p-4 rounded-2xl border border-black/5">
              <code className="block text-xs font-mono break-all select-all text-black/80">
                {`<script src="https://proofly.vercel.app/proofly.js" defer></script>`}
              </code>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: REVIEWS FEED & STREAM PREVIEW */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm min-h-[400px] flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-black/40 mb-4">Submissions Live Feed</h3>

            {loading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-black/40">
                Syncing database...
              </div>
            ) : reviews.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <span className="text-3xl mb-2">📥</span>
                <p className="text-sm font-medium text-black/80">No reviews submitted yet</p>
                <p className="text-xs text-black/40 mt-1">Your video submissions will automatically pop up here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-black/5 text-xs text-black/40 font-semibold uppercase">
                      <th className="pb-3 font-semibold">Product</th>
                      <th className="pb-3 font-semibold">Rating</th>
                      <th className="pb-3 font-semibold text-center">Status</th>
                      <th className="pb-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 text-sm">
                    {reviews.map((review) => (
                      <tr key={review.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-4 font-mono text-xs font-semibold text-black/70">
                          {review.product_id || 'unlinked'}
                        </td>
                        <td className="py-4 text-amber-500 font-medium">
                          {'★'.repeat(review.rating)}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            review.status === 'approved' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {review.status || 'pending'}
                          </span>
                        </td>
                        <td className="py-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => setActiveVideo(review.google_file_id)}
                            className="bg-black/5 hover:bg-black/10 text-xs font-medium px-3 py-1.5 rounded-full transition-colors inline-flex items-center gap-1"
                          >
                            ▶ Preview
                          </button>
                          
                          <button
                            onClick={() => toggleReviewStatus(review.id, review.status)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors border ${
                              review.status === 'approved'
                                ? 'border-red-200 text-red-600 bg-white hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-600 bg-white hover:bg-emerald-50'
                            }`}
                          >
                            {review.status === 'approved' ? '⏸ Hide' : '🚀 Approve'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: INTEGRATED VIDEO PLAYBACK */}
      {activeVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111] max-w-sm w-full aspect-[9/16] rounded-3xl overflow-hidden relative shadow-2xl border border-white/10">
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 z-50 bg-white/10 hover:bg-white/20 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg transition-colors border border-white/10"
            >
              ✕
            </button>
            <video
              className="w-full h-full object-cover"
              controls
              autoPlay
              src={`/api/stream?fileId=${activeVideo}`}
            />
          </div>
        </div>
      )}
    </main>
  );
}
