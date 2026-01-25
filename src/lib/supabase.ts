import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vscticoufxoyxyhuzkeu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzY3RpY291ZnhveXh5aHV6a2V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTUzNDEsImV4cCI6MjA4NDkzMTM0MX0.1o0loHeC86OJ6LQ9UGeTfcedWkZIauxNsJfCMeddwiA'

export const supabase = createClient(supabaseUrl, supabaseKey)
