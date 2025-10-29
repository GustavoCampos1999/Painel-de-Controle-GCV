const SUPABASE_URL = 'https://tyixoquzxuclxvbokhif.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5aXhvcXV6eHVjbHh2Ym9raGlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MTk0MDMsImV4cCI6MjA3NzI5NTQwM30.j5t8ZLByA0pwJy22uOr6VFNGQruvXv1vj4JW_DLAfbM'; 

const { createClient } = supabase;

export const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);