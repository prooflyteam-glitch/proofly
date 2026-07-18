'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SubmitReviewPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Extract both dynamic multi-tenant context items from URL parameters
  const searchParams = useSearchParams();
  const merchantEmail = searchParams.get('store'); 
  const productId = searchParams.get('productId');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    // Fail early if structural URL data is missing to protect the database schema
    if (!merchantEmail || !productId) {
      alert('Error: Submission link is invalid or incomplete. Missing merchant context.');
      return;
    }

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('video', file);
    formData.append('rating', rating.toString());
    formData.append('merchant_email', merchantEmail); // Fixed: Dynamic merchant routing
    formData.append('product_id', productId);         // Fixed: Dynamic product linking

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setIsSuccess(true);
      } else {
        console.error('Upload failed');
        alert('Failed to process upload. Please check network connection or file size.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An unexpected error occurred during submission.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isSuccess) {
    return (
      <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full rounded-[2rem] p-8 shadow-sm border border-black/5 text-center animate-fade-in">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
            ✓
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F] mb-2">Thank you!</h1>
          <p className="text-black/60">Your video review and rating have been successfully submitted.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="bg-white max-w-md w-full rounded-[2rem] p-8 shadow-sm border border-black/5">
        <header className="text-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F] mb-2">Leave a Video Review</h1>
          <p className="text-sm text-black/60">Share your experience with our product.</p>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Interactive Rating Stars */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-[#1D1D1F]">Your Rating</span>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-3xl focus:outline-none transition-transform active:scale-90"
                >
                  <svg
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-black/10 fill-none stroke-black/20 stroke-2'
                    }`}
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          {/* Video Input */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#1D1D1F]">Select Video</label>
            <input 
              type="file" 
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-black/60 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-black/5 file:text-[#1D1D1F] hover:file:bg-black/10 transition-all cursor-pointer"
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={!file || isUploading}
            className="w-full bg-[#1D1D1F] text-white font-medium py-4 px-6 rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isUploading ? 'Uploading...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </main>
  );
}
