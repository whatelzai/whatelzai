"use client";
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  RefreshCw,
  Check,
  Clock3,
  Ticket,
  Mail,
  UserRound,
  ChevronDown,
  Ban,
  Gift,
  CircleHelp,
} from "lucide-react";
import {
  filterAttendees,
  paymentNames,
  type EventData,
  type Payment,
} from "@/lib/event-admin/model";
import { currentEvent as mapEvent } from "@/lib/public-events/map";
import { retryEventTicketEmail } from "@/app/admin/event-checkin/actions";
import ManualCheckin from "./ManualCheckin";
import ScanTickets from "./ScanTickets";
const icons: Record<Payment, typeof Check> = {
  paid: Check,
  free: Gift,
  pending: Clock3,
  released: Ban,
  refunded: Ban,
  unknown: CircleHelp,
};
export default function AttendeeList() {
  const [data, setData] = useState<EventData | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refreshing, setRefreshing] = useState(true),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState("active"),
    [revision, refresh] = useState(0),
    [page, setPage] = useState(0),
    [busy, start] = useTransition();
  const router = useRouter();
  const reload = useCallback(() => {
    setRefreshing(true);
    refresh((v) => v + 1);
  }, []);
  useEffect(() => {
    const c = new AbortController();
    fetch("/api/admin/event-registrations", {
      cache: "no-store",
      signal: c.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        return d;
      })
      .then((d) => {
        if (!c.signal.aborted) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!c.signal.aborted) {
          setLoading(false);
          setRefreshing(false);
        }
      });
    return () => c.abort();
  }, [revision]);
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") reload();
    };
    const timer = setInterval(tick, 30000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [reload]);
  const rows = data ? filterAttendees(data.rows, q, filter) : [],
    c = data?.counts;
  const activePage = Math.min(
    page,
    Math.max(0, Math.ceil(rows.length / 25) - 1),
  );
  return (
    <section className="event-attendees" aria-label="Event attendees">
      <div className="event-admin-top">
        <div>
          <h1>Registrations</h1>
          <p>
            {new Date(mapEvent.startsAt).toLocaleDateString("en-SG", {
              day: "numeric",
              month: "short",
              timeZone: "Asia/Singapore",
            })}{" "}
            · {mapEvent.shortName}
          </p>
        </div>
        <button
          className="event-icon"
          aria-label="Refresh registrations"
          disabled={refreshing}
          onClick={() => {
            reload();
            router.refresh();
          }}
        >
          <RefreshCw size={18} className={refreshing ? "event-spin" : ""} />
        </button>
      </div>
      <ScanTickets
        onCheckedIn={() => {
          reload();
          router.refresh();
        }}
      />
      {loading ? (
        <div className="event-loading" role="status">
          Loading registrations…
        </div>
      ) : (
        c && (
          <div className="event-numbers">
            <div>
              <UsersIcon />
              <strong>
                {c.confirmed}
                <small> / {mapEvent.capacity}</small>
              </strong>
              <span>Confirmed</span>
            </div>
            <div>
              <Clock3 />
              <strong>{c.pending}</strong>
              <span>Pending</span>
            </div>
            <div>
              <Ticket />
              <strong>
                {c.paid}
                <small> + {c.free} free</small>
              </strong>
              <span>Paid tickets</span>
            </div>
            <div>
              <Check />
              <strong>{c.checkedIn}</strong>
              <span>Checked in</span>
            </div>
          </div>
        )
      )}
      {error && (
        <p role="alert" className="event-error">
          {error}
          {data && " Showing the last successful read."}
        </p>
      )}
      {c && (
        <div className="event-ledger-note">
          <span>
            S${(c.recordedPaidMinor / 100).toFixed(2)} recorded paid · excludes
            fees
            {c.unknown
              ? ` · ${c.unknown} ticket amount${c.unknown === 1 ? "" : "s"} not recorded`
              : ""}
          </span>
          <span>
            {c.emailPending
              ? `${c.emailPending} ticket email${c.emailPending === 1 ? "" : "s"} pending`
              : ""}
            {c.review
              ? ` · ${c.review} confirmation${c.review === 1 ? "" : "s"} to review`
              : ""}
          </span>
        </div>
      )}
      <div className="event-search">
        <label>
          <Search size={18} />
          <input
            aria-label="Find attendee"
            type="search"
            placeholder="Find a person"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          aria-label="Filter registrations"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
        >
          <option value="active">Attendees</option>
          <option value="all">All records</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="attention">Needs attention</option>
          <option value="checked-in">Checked in</option>
          <option value="cancelled">Cancelled / released</option>
        </select>
      </div>
      <div className="event-table-heading" aria-hidden="true">
        <span>Person</span>
        <span>Payment</span>
        <span>Ticket email</span>
        <span>Check-in</span>
      </div>
      <div
        className="event-attendee-scroll"
        role="region"
        aria-label="Attendee list"
        tabIndex={0}
        aria-busy={refreshing}
      >
        {rows.slice(activePage * 25, (activePage + 1) * 25).map((r) => {
          const Icon = icons[r.payment];
          return (
            <div className="event-person-row" key={r.id}>
              <details className="event-person">
                <summary>
                  <span className="event-person-name">
                    <strong>{r.name}</strong>
                    <small>
                      {r.status === "needs-review"
                        ? "Confirmation needs review"
                        : r.status === "cancelled"
                          ? "Cancelled ticket"
                          : r.status === "released"
                            ? "Reservation released"
                            : r.ticket
                              ? "Registered"
                              : "Signup started"}
                    </small>
                  </span>
                  <span className={`event-payment event-payment-${r.payment}`}>
                    <Icon size={15} />
                    {paymentNames[r.payment]}
                    {r.amount !== null &&
                      r.amount > 0 &&
                      r.payment !== "refunded" && (
                        <small>S${(r.amount / 100).toFixed(2)}</small>
                      )}
                  </span>
                  <span className="event-email-state">
                    <Mail size={14} />
                    {r.emailSent
                      ? "Sent"
                      : r.status === "confirmed"
                        ? "Pending"
                        : "—"}
                  </span>
                  <span className="event-checkin-state">
                    {r.checkedIn ? (
                      <span className="event-checked-icon" aria-hidden="true">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    ) : (
                      <Clock3 size={14} aria-hidden="true" />
                    )}
                    {r.checkedIn
                      ? "Checked in"
                      : r.status === "confirmed"
                        ? "Not checked in"
                        : "—"}
                  </span>
                  <ChevronDown size={15} className="event-person-chevron" />
                </summary>
                <div className="event-person-detail">
                  <dl>
                    <div>
                      <dt>Email</dt>
                      <dd>
                        <a href={`mailto:${r.email}`}>{r.email}</a>
                      </dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>
                        <a href={`tel:${r.phone}`}>{r.phone || "—"}</a>
                      </dd>
                    </div>
                    <div>
                      <dt>Registered</dt>
                      <dd>
                        {new Date(r.createdAt).toLocaleString("en-SG", {
                          timeZone: "Asia/Singapore",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        SGT
                      </dd>
                    </div>
                    <div>
                      <dt>Account</dt>
                      <dd>
                        {r.accountLinked
                          ? "Linked to verified sign-in"
                          : "Not linked / not recorded"}
                      </dd>
                    </div>
                    <div>
                      <dt>Source</dt>
                      <dd>
                        {r.source === "platform"
                          ? "Whatelz form"
                          : "Earlier Stripe checkout"}
                      </dd>
                    </div>
                    {r.checkedIn && (
                      <div>
                        <dt>Checked in</dt>
                        <dd>
                          {new Date(r.checkedIn).toLocaleString("en-SG", {
                            timeZone: "Asia/Singapore",
                          })}
                        </dd>
                      </div>
                    )}
                  </dl>
                  {r.ticket && r.status === "confirmed" && !r.emailSent && (
                    <button
                      disabled={busy}
                      onClick={() =>
                        start(async () => {
                          try {
                            const form = new FormData();
                            form.set("ticket_id", r.ticket!);
                            await retryEventTicketEmail(form);
                            reload();
                          } catch {
                            setError(
                              "Ticket email could not be sent. Refresh and retry.",
                            );
                          }
                        })
                      }
                    >
                      <Mail size={15} />
                      {busy ? "Sending…" : "Retry ticket email"}
                    </button>
                  )}
                  {r.source === "legacy" && r.payment === "unknown" && (
                    <p>
                      Payment amount wasn’t stored for this earlier checkout.
                      Verify in Stripe; it is excluded from the recorded total.
                    </p>
                  )}
                </div>
              </details>
              <ManualCheckin
                person={r}
                onCheckedIn={() => {
                  reload();
                  router.refresh();
                }}
              />
            </div>
          );
        })}
      </div>
      {!loading && !error && rows.length === 0 && (
        <p className="event-empty">
          {data?.rows.length
            ? "No matching people."
            : "No signups recorded yet."}
        </p>
      )}
      {rows.length > 25 && (
        <div className="event-pagination">
          <button
            disabled={activePage === 0}
            onClick={() => setPage(activePage - 1)}
          >
            Previous
          </button>
          <span>
            {activePage * 25 + 1}–{Math.min((activePage + 1) * 25, rows.length)}{" "}
            / {rows.length}
          </span>
          <button
            disabled={(activePage + 1) * 25 >= rows.length}
            onClick={() => setPage(activePage + 1)}
          >
            Next
          </button>
        </div>
      )}
      <footer className="event-admin-footer">
        <small>
          {data
            ? `Updated ${new Date(data.asOf).toLocaleTimeString("en-SG", { timeZone: "Asia/Singapore", hour: "2-digit", minute: "2-digit", second: "2-digit" })} SGT · refreshes every 30s while visible`
            : ""}
        </small>
      </footer>
    </section>
  );
}
function UsersIcon() {
  return <UserRound />;
}
