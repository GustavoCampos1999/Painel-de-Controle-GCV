const SUPABASE_URL = 'https://qhmrlolsrqrbbhkvutvp.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFobXJsb2xzcnFyYmJoa3Z1dHZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMTg0NTUsImV4cCI6MjA3Njc5NDQ1NX0._-S8K4PknHE4vUNUF6XlrD0bbpP_F35s4GyMC117xRA'; 

const { createClient } = supabase;

export const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);