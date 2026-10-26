import { headers } from "next/headers";
import { safeAuthRedirect } from "@/lib/auth/redirect";

export const dynamic = "force-dynamic";
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string; error?: string }>;
}) {
  const params = await searchParams;
  const h = await headers();
  const host = h.get("host") ?? "whatelz.ai";
  const origin = `${host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https"}://${host}`;
  const settings = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
    {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      cache: "no-store",
    },
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);
  const enabled = settings?.external?.google === true;
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="w-full max-w-md space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 text-zinc-900">
        <a href="https://whatelz.ai" className="text-sm font-semibold">
          whatelz.ai
        </a>
        <h1 className="text-3xl font-semibold">Welcome to Whatelz</h1>
        <p className="text-sm text-zinc-600">
          Sign in or create your account with Google.
        </p>
        {params.error ? (
          <p role="alert" className="text-sm text-red-700">
            Sign-in could not be completed. Please try again.
          </p>
        ) : null}
        <form action="/auth/google" method="post">
          <input
            type="hidden"
            name="next"
            value={safeAuthRedirect(params.redirect_url, origin)}
          />
          <button
            type="submit"
            disabled={!enabled}
            className="w-full rounded-lg bg-zinc-900 px-4 py-3 font-medium text-white disabled:opacity-40"
          >
            Continue with Google
          </button>
        </form>
        {!enabled ? (
          <p className="text-sm text-zinc-500">
            Google sign-in is being configured. Please check back soon.
          </p>
        ) : null}
        <p className="text-xs text-zinc-500">
          Signing in creates an account. Your administrator verifies and links
          your team profile separately.
        </p>
      </section>
    </main>
  );
}
