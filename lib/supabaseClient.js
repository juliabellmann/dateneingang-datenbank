// lib/supabaseClient.js

// "Data API -> URL"
// "API Keys -> anon public"

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mfjjiwhazcslconavjuy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mamppd2hhemNzbGNvbmF2anV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NDk4MzEsImV4cCI6MjA3NjIyNTgzMX0.PjZS79naQCsXXGZ-Hw4iyJH8EzQtBgwQb1p0gXuw6rI'
);

export default supabase;



// ist quasi das selbe wie:

// lib/supabaseClient.js
// import { createClient } from '@supabase/supabase-js'

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// export const supabase = createClient(supabaseUrl, supabaseAnonKey)
