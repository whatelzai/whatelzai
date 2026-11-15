export type Ticket = {
  id: string;
  signup_attempt_id: string | null;
  person_id: string | null;
  attendee_name: string;
  email: string;
  phone: string;
  status: string;
  email_sent_at: string | null;
  checked_in_at: string | null;
  created_at: string;
  stripe_payment_intent_id: string | null;
};
export type Attempt = {
  id: string;
  attendee_name: string;
  email: string;
  phone: string;
  amount: number;
  state: string;
  created_at: string;
  payment_started_at: string | null;
};
export type Payment =
  | "paid"
  | "free"
  | "pending"
  | "released"
  | "refunded"
  | "unknown";
export type Attendee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  ticket: string | null;
  status: string;
  payment: Payment;
  amount: number | null;
  createdAt: string;
  emailSent: string | null;
  checkedIn: string | null;
  accountLinked: boolean;
  source: "platform" | "legacy";
};
export function eventView(
  tickets: Ticket[],
  attempts: Attempt[],
  refunds: string[],
  people: { id: string; user_id: string | null }[],
) {
  const byAttempt = new Map(attempts.map((a) => [a.id, a])),
    used = new Set<string>(),
    refunded = new Set(refunds),
    linked = new Set(people.filter((p) => p.user_id).map((p) => p.id));
  const rows: Attendee[] = tickets.map((t) => {
    const a = t.signup_attempt_id
      ? byAttempt.get(t.signup_attempt_id)
      : undefined;
    if (a) used.add(a.id);
    const isRefunded =
      !!t.stripe_payment_intent_id && refunded.has(t.stripe_payment_intent_id);
    // Legacy tickets do not store amounts. Never infer S$7 or free from their existence.
    const payment: Payment = isRefunded
      ? "refunded"
      : a?.state === "confirmed"
        ? a.amount === 0
          ? "free"
          : [700, 800].includes(a.amount)
            ? "paid"
            : "unknown"
        : "unknown";
    return {
      id: "ticket:" + t.id,
      name: t.attendee_name,
      email: t.email,
      phone: t.phone,
      ticket: t.id,
      status: t.status,
      payment,
      amount: a?.state === "confirmed" ? a.amount : null,
      createdAt: t.created_at,
      emailSent: t.email_sent_at,
      checkedIn: t.checked_in_at,
      accountLinked: !!t.person_id && linked.has(t.person_id),
      source: t.signup_attempt_id ? "platform" : "legacy",
    };
  });
  for (const a of attempts) {
    if (used.has(a.id)) continue;
    rows.push({
      id: "attempt:" + a.id,
      name: a.attendee_name,
      email: a.email,
      phone: a.phone,
      ticket: null,
      status:
        a.state === "released"
          ? "released"
          : a.state === "confirmed"
            ? "needs-review"
            : "pending",
      payment: a.state === "released" ? "released" : "pending",
      amount: a.amount,
      createdAt: a.created_at,
      emailSent: null,
      checkedIn: null,
      accountLinked: false,
      source: "platform",
    });
  }
  rows.sort(
    (a, b) =>
      b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
  );
  const confirmed = rows.filter((r) => r.status === "confirmed"),
    pending = rows.filter((r) => r.status === "pending"),
    paid = confirmed.filter((r) => r.payment === "paid"),
    free = confirmed.filter((r) => r.payment === "free");
  return {
    rows,
    counts: {
      confirmed: confirmed.length,
      pending: pending.length,
      paid: paid.length,
      free: free.length,
      checkedIn: confirmed.filter((r) => r.checkedIn).length,
      emailPending: confirmed.filter((r) => !r.emailSent).length,
      review: rows.filter((r) => r.status === "needs-review").length,
      unknown: confirmed.filter((r) => r.payment === "unknown").length,
      recordedPaidMinor: paid.reduce((sum, r) => sum + (r.amount || 0), 0),
    },
  };
}
export type EventData = ReturnType<typeof eventView> & { asOf: string };
export const paymentNames: Record<Payment, string> = {
  paid: "Paid",
  free: "Free",
  pending: "Pending",
  released: "Released",
  refunded: "Refunded",
  unknown: "Not recorded",
};
export function filterAttendees(rows: Attendee[], q: string, filter: string) {
  const term = q.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (!term ||
        [r.name, r.email, r.phone].some((v) =>
          v.toLowerCase().includes(term),
        )) &&
      (filter === "all" ||
        (filter === "active" &&
          r.status !== "released" &&
          r.status !== "cancelled") ||
        (filter === "confirmed" && r.status === "confirmed") ||
        (filter === "pending" && r.status === "pending") ||
        (filter === "attention" &&
          (r.status === "needs-review" ||
            (r.status === "confirmed" &&
              (!r.emailSent || r.payment === "unknown")))) ||
        (filter === "checked-in" &&
          r.status === "confirmed" &&
          !!r.checkedIn) ||
        (filter === "cancelled" &&
          (r.status === "cancelled" || r.status === "released"))),
  );
}
