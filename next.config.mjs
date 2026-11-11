import { validateSupabasePublishableKey } from "./src/lib/supabase/config.ts";

// Bloqueia chaves privilegiadas antes de NEXT_PUBLIC_ ser incluído no bundle.
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (key) validateSupabasePublishableKey(key, process.env.NEXT_PUBLIC_SUPABASE_ENV);

const nextConfig = {};
export default nextConfig;
