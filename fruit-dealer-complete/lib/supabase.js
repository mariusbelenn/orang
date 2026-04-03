import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rcighscfkpuruzoetmtm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjaWdoc2Nma3B1cnV6b2V0bXRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMDIyMjAsImV4cCI6MjA5MDc3ODIyMH0.TuLzpLUnHUpEmEs8nF4lEgD2YSigk8DEa32oDqBKThA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
