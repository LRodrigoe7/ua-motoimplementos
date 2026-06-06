import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Cliente con service_role — bypasea RLS automáticamente.
// Solo se usa en API routes y Server Components (NUNCA en el browser).
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
