// Supabase configuration for production
const SUPABASE_URL = "https://bqemaogpiunlbdhzvlyd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZW1hb2dwaXVubGJkaHp2bHlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MTcwMTIsImV4cCI6MjA3MTM5MzAxMn0.TvzBF6pdrfAOLZUDISvebqYR71zKkZOX-jDlTvOMBQg";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.supabaseClient = supabase;
