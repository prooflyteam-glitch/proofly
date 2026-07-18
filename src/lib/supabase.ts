import { createClient } from '@supabase/supabase-js';

// These grab the secret keys from your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This creates the actual bridge we will use throughout the app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
