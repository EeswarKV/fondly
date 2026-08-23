import { createServerClient } from "@supabase/ssr";
import { getRequestHeader, setCookie } from "@tanstack/react-start/server";

function parseCookieHeader(header: string) {
  if (!header) return [];
  return header.split(";").map((pair) => {
    const [name, ...rest] = pair.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

// Server-side Supabase client for use inside TanStack Start server functions
// and route loaders. Reads/writes the auth session via cookies, so a
// beforeLoad on a protected route can check `supabase.auth.getUser()` before
// the page is ever rendered.
export function getSupabaseServerClient() {
  return createServerClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(getRequestHeader("cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(name, value, options as any);
          });
        },
      },
    },
  );
}
