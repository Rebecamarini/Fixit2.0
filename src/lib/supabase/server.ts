import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicSupabaseConfig } from "./config";

// Auth mutations must run in a Server Action or Route Handler so cookies can
// be written. In Server Components the proxy persists refreshed cookies.
export async function createServerSupabaseClient() {
  const { url, publishableKey } = getPublicSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(values) {
        try {
          for (const { name, value, options } of values) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write; src/proxy.ts refreshes before render.
        }
      },
    },
  });
}
