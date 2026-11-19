import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  getStripe,
  STRIPE_WEBHOOK_SECRET,
  isStripeConfigured,
} from "@/lib/stripe-server";
import { upsertSubscriptionFromStripe } from "@/lib/subscription";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  grantEntitlement,
  revokeEntitlementByCharge,
} from "@/lib/entitlements";
import {
  fulfillPlatformSession,
  releasePlatformSession,
} from "@/lib/platform-event-registration";
import { sendEventConfirmation } from "@/lib/send-event-confirmation";
import { logWebhookEvent } from "@/lib/webhook-log";
import {
  canFulfillCheckout,
  entitlementProductSlug,
  checkoutGrantKey,
} from "@/lib/stripe-fulfillment";

export const dynamic = "force-dynamic";
// Stripe requires the raw request body for signature verification.
export const runtime = "nodejs";

async function findOfferIdForPrice(priceId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("stripe_offers")
    .select("id")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  return data?.id ?? null;
}

async function findOfferSlugForPrice(priceId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("stripe_offers")
    .select("slug")
    .eq("stripe_price_id", priceId)
    .maybeSingle();
  return data?.slug ?? null;
}

async function resolvePaymentUserId(
  internalId: string | null | undefined,
  legacyId: string | null | undefined,
): Promise<string | null> {
  if (!internalId && !legacyId) return null;
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq(internalId ? "id" : "clerk_user_id", internalId ?? legacyId!)
    .maybeSingle();
  if (error) throw new Error("Payment owner lookup failed");
  return data?.id ?? null;
}

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const clerkId =
    (sub.metadata?.clerk_id as string | undefined) ??
    (typeof sub.customer === "object" &&
    sub.customer &&
    "metadata" in sub.customer
      ? ((sub.customer.metadata?.clerk_id as string | undefined) ?? null)
      : null);
  const userId = await resolvePaymentUserId(sub.metadata?.user_id, clerkId);
  if (!userId) {
    console.warn(
      `[stripe] subscription ${sub.id} has no mapped account owner; skipping.`,
    );
    return;
  }

  const item = sub.items.data[0];
  const priceId = item?.price?.id;
  if (!priceId) {
    console.warn(`[stripe] subscription ${sub.id} has no price; skipping.`);
    return;
  }

  const offerId =
    (sub.metadata?.offer_id as string | undefined) ??
    (await findOfferIdForPrice(priceId));

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // current_period_end lives on the subscription item in newer Stripe API
  // versions and on the subscription itself in older ones. Read both.
  const periodEnd =
    (item as unknown as { current_period_end?: number })?.current_period_end ??
    (sub as unknown as { current_period_end?: number })?.current_period_end ??
    null;

  await upsertSubscriptionFromStripe({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    offer_id: offerId,
    status: sub.status,
    current_period_end: periodEnd,
    cancel_at_period_end: sub.cancel_at_period_end,
  });
}

// One-off (Playbook) grant path. Anonymous checkout is intentional per
// SPR-110 — user_id is null here and stitched later (SPR-112) on Google sign-in
// via customer_email match. Idempotent on stripe_event_id.
async function grantOneOffFromSession(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
): Promise<void> {
  if (!canFulfillCheckout(session)) return;
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  if (!customerId) {
    console.warn(`[stripe] session ${session.id} has no customer; skipping.`);
    return;
  }

  const email =
    session.customer_details?.email ??
    (session.customer_email as string | null | undefined) ??
    null;
  if (!email) {
    console.warn(`[stripe] session ${session.id} has no email; skipping.`);
    return;
  }

  // Resolve product_slug — prefer offer_slug from checkout metadata
  // (SPR-110's route sets it), fall back to price → offer lookup.
  let productSlug =
    (session.metadata?.offer_slug as string | undefined) ?? null;
  let chargeId: string | null = null;

  if (!productSlug || !chargeId) {
    const line = await stripe.checkout.sessions.listLineItems(session.id, {
      limit: 1,
    });
    const priceId = line.data[0]?.price?.id ?? null;
    if (!productSlug && priceId) {
      productSlug = await findOfferSlugForPrice(priceId);
    }
  }
  if (!productSlug) {
    console.warn(
      `[stripe] session ${session.id} could not resolve product_slug; skipping.`,
    );
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  if (paymentIntentId) {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    chargeId = pi.latest_charge
      ? typeof pi.latest_charge === "string"
        ? pi.latest_charge
        : pi.latest_charge.id
      : null;
  }

  const clerkId = (session.metadata?.clerk_id as string | undefined) ?? null;

  await grantEntitlement({
    app_user_id: await resolvePaymentUserId(session.metadata?.user_id, clerkId),
    stripe_customer_id: customerId,
    customer_email: email,
    product_slug: entitlementProductSlug(productSlug),
    stripe_event_id: checkoutGrantKey(session.id),
    stripe_checkout_session_id: session.id,
    stripe_charge_id: chargeId,
  });
}

export async function POST(req: Request) {
  if (!isStripeConfigured() || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Stripe webhook not configured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "Signature verification failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          if (
            !sub.metadata?.clerk_id &&
            !sub.metadata?.user_id &&
            session.client_reference_id
          ) {
            await stripe.subscriptions.update(subId, {
              metadata: {
                ...(sub.metadata ?? {}),
                ...(session.metadata?.user_id
                  ? { user_id: session.client_reference_id }
                  : { clerk_id: session.client_reference_id }),
                offer_id: (session.metadata?.offer_id as string) ?? "",
              },
            });
            const fresh = await stripe.subscriptions.retrieve(subId);
            await syncSubscription(fresh);
          } else {
            await syncSubscription(sub);
          }
        } else if (session.mode === "payment") {
          if (
            !(await fulfillPlatformSession(session)) &&
            !(await sendEventConfirmation(session))
          )
            await grantOneOffFromSession(session, stripe);
        }
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "payment")
          if (
            !(await fulfillPlatformSession(session)) &&
            !(await sendEventConfirmation(session))
          )
            await grantOneOffFromSession(session, stripe);
        break;
      }
      case "checkout.session.expired":
        await releasePlatformSession(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "checkout.session.async_payment_failed":
        await releasePlatformSession(
          event.data.object as Stripe.Checkout.Session,
          true,
        );
        // No access was granted while the payment was unpaid.
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subRef = (
          invoice as unknown as { subscription?: string | Stripe.Subscription }
        ).subscription;
        if (subRef) {
          const subId = typeof subRef === "string" ? subRef : subRef.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        // Only revoke if fully refunded — partial refunds leave access intact.
        if (charge.refunded) {
          const paymentIntent =
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : charge.payment_intent?.id;
          if (paymentIntent) {
            const { error: ledgerError } = await supabaseAdmin
              .from("event_refund_ledger")
              .upsert(
                { stripe_payment_intent_id: paymentIntent },
                {
                  onConflict: "stripe_payment_intent_id",
                  ignoreDuplicates: true,
                },
              );
            if (ledgerError)
              throw new Error("Refund receipt could not be saved");
            const { error } = await supabaseAdmin
              .from("event_registrations")
              .update({ status: "cancelled" })
              .eq("stripe_payment_intent_id", paymentIntent);
            if (error) throw new Error("Ticket cancellation failed");
          }
          await revokeEntitlementByCharge(charge.id);
        }
        break;
      }

      default:
        // Ignore other events; Stripe retries only on non-2xx.
        break;
    }
    await logWebhookEvent(event.id, event.type, true, null);
    return NextResponse.json({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook handler failed";
    console.error("[stripe webhook]", event.type, msg);
    await logWebhookEvent(event.id, event.type, false, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
