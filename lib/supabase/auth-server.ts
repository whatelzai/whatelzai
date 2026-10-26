import "server-only";
import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { authCookieOptions } from "@/lib/auth/redirect";

export async function createAuthClient() {
  const store = await cookies();
  const requestHeaders = await headers();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: authCookieOptions(requestHeaders.get("host") ?? ""),
      cookies: {
        getAll: () => store.getAll(),
        setAll(values) {
          try {
            for (const { name, value, options } of values)
              store.set(name, value, options);
          } catch {
            /* Server Components cannot write cookies; proxy refreshes them. */
          }
        },
      },
    },
  );
}

// getUser checks the current session with Supabase, including sign-out/revocation.
export const getVerifiedAuthUser = cache(async () => {
  const client = await createAuthClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.email_confirmed_at) return null;
  return data.user;
});
