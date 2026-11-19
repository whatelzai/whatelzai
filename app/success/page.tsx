import type { Metadata } from "next";
import Link from "next/link";
import { getStripe, isStripeConfigured } from "@/lib/stripe-server";
import { SignUpBlock } from "./sign-up-block";
import { canFulfillCheckout } from "@/lib/stripe-fulfillment";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Welcome to the Playbook",
  description: "Purchase confirmed.",
  robots: { index: false, follow: false },
};

async function loadEmail(
  sessionId: string | undefined,
): Promise<string | null> {
  if (!sessionId || !isStripeConfigured()) return null;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!canFulfillCheckout(session)) return null;
    if (
      session.metadata?.product_slug !== "playbook" &&
      session.metadata?.offer_slug !== "playbook" &&
      session.metadata?.offer_slug !== "playbook-lifetime-v1"
    )
      return null;
    return (
      session.customer_details?.email ??
      (session.customer_email as string | null | undefined) ??
      null
    );
  } catch {
    return null;
  }
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const email = await loadEmail(session_id);

  if (!email)
    return (
      <main className="field-wrap py-20">
        <h1 className="text-3xl">Your order is not confirmed yet.</h1>
        <p className="my-6">
          Payment may still be processing. Check your Stripe confirmation, or
          return to your account to check access.
        </p>
        <Link href="/account" className="text-link">
          Check my account →
        </Link>
      </main>
    );

  return (
    <main className="editorial-index mx-auto max-w-xl px-6 py-20">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-emerald-900">
        <p className="text-sm font-medium">Purchase confirmed.</p>
        <p className="mt-1 text-sm">
          The Playbook is yours — lifetime access, every future update.
        </p>
      </div>

      <div className="mt-10">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Create your free account
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your account holds your Playbook access and your archetype from the
          quiz. Sign up with the same email you used at checkout so we can link
          them automatically.
        </p>

        <div className="mt-6">
          <SignUpBlock prefilledEmail={email} />
        </div>
      </div>

      <div className="mt-12 border-t border-zinc-100 pt-6 text-sm text-zinc-500">
        Prefer to read first?{" "}
        <Link href="/playbook/read" className="underline">
          Open the book
        </Link>
        . You&apos;ll be prompted to sign in when you get there.
      </div>
    </main>
  );
}
