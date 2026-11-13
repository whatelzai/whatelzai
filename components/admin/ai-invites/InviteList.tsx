"use client";
import { useMemo, useState, useEffect, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  ArrowLeft,
  Check,
  CalendarDays,
  MessageCircle,
  Star,
} from "lucide-react";
import {
  locations,
  matchesInviteLocation,
  channels,
  responses,
  relationships,
  statuses,
  singaporeToday,
  type InviteContact,
  type Contact,
  type Invitation,
} from "@/lib/ai-invites/model";
type Write = (value: Record<string, unknown>) => Promise<void>;
async function saveEntry(value: Record<string, unknown>) {
  const r = await fetch("/api/admin/ai-invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Save unavailable. Please retry.");
}
function date(value: string | null) {
  if (!value) return "Not set";
  return new Date(value.slice(0, 10) + "T12:00:00+08:00").toLocaleDateString(
    "en-SG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Singapore",
    },
  );
}
export default function InviteList({
  initial,
  saveRequest = saveEntry,
}: {
  initial: InviteContact[];
  saveRequest?: Write;
}) {
  const router = useRouter(),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [location, setLocation] = useState("all"),
    [selected, setSelected] = useState<string | null>(null),
    [contactForm, setContactForm] = useState<Contact | null | undefined>(
      undefined,
    ),
    [inviteForm, setInviteForm] = useState<{
      person: InviteContact;
      entry: Invitation | null;
    } | null>(null);
  const today = singaporeToday();
  const scoped = useMemo(
    () => initial.filter((c) => matchesInviteLocation(c, location)),
    [initial, location],
  );
  const person = scoped.find((c) => c.id === selected);
  const filtered = useMemo(
    () =>
      scoped
        .filter((c) =>
          [c.name, c.email, c.phone, c.interests, c.next_step, c.collaboration]
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase().trim()),
        )
        .filter(
          (c) =>
            filter === "all" ||
            (filter === "followup" &&
              c.status === "active" &&
              c.follow_up_on &&
              c.follow_up_on <= today) ||
            (filter === "priority" && c.priority) ||
            (filter === "returning" && c.attendance.length > 1) ||
            (filter === "do_not_contact" && c.status === "do_not_contact"),
        )
        .sort(
          (a, b) =>
            Number(b.priority) - Number(a.priority) ||
            (a.follow_up_on || "9999").localeCompare(
              b.follow_up_on || "9999",
            ) ||
            a.name.localeCompare(b.name),
        ),
    [scoped, search, filter, today],
  );
  const due = scoped.filter(
    (c) => c.status === "active" && c.follow_up_on && c.follow_up_on <= today,
  ).length;
  const refresh = () => router.refresh();
  return (
    <>
      <div className="invite-overview">
        <p>
          <strong>{scoped.length}</strong>{" "}
          {scoped.length === 1 ? "person" : "people"} <span>·</span>{" "}
          <strong>{scoped.reduce((n, c) => n + c.attendance.length, 0)}</strong>{" "}
          attended visits <span>·</span> <strong>{due}</strong> follow-ups due
        </p>
        <button className="invite-primary" onClick={() => setContactForm(null)}>
          <Plus size={16} />
          Add person
        </button>
      </div>
      <div className={`invite-workspace ${person ? "has-selection" : ""}`}>
        <section className="invite-list-panel" aria-label="People">
          <div className="invite-toolbar">
            <label className="invite-search">
              <span className="sr-only">Search people</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, interests or next step"
              />
            </label>
            <label>
              <span className="sr-only">Filter people</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All people</option>
                <option value="followup">Follow-up due</option>
                <option value="priority">Priority</option>
                <option value="returning">Returning attendees</option>
                <option value="do_not_contact">Do not contact</option>
              </select>
            </label>
          </div>
          <div className="invite-location-filter">
            <label>
              <span>Location</span>
              <select
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setSelected(null);
                }}
                aria-label="Filter by location"
              >
                <option value="all">All locations</option>
                {Object.entries(locations).map(([code, label]) => (
                  <option key={code} value={code}>
                    {code} · {label}
                  </option>
                ))}
                <option value="unset">Not set</option>
              </select>
            </label>
          </div>
          <div className="invite-column-head" aria-hidden="true">
            <span>Person / next step</span>
            <span>Location</span>
            <span>Invites logged</span>
            <span>Attended</span>
          </div>
          <ul className="invite-people">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  aria-pressed={c.id === selected}
                  onClick={() => setSelected(c.id)}
                >
                  <span className="invite-person-copy">
                    <strong>
                      {c.priority && <Star size={14} aria-label="Priority" />}
                      {c.name}
                    </strong>
                    <small>
                      {c.status !== "active"
                        ? statuses[c.status]
                        : c.next_step || "Add a next step"}
                    </small>
                    {c.follow_up_on && (
                      <small
                        className={
                          c.status === "active" && c.follow_up_on <= today
                            ? "invite-due"
                            : ""
                        }
                      >
                        <CalendarDays size={12} />
                        {date(c.follow_up_on)}
                      </small>
                    )}
                  </span>
                  <span className="invite-location">
                    <span className="invite-mobile-label">Location</span>
                    {c.location || "—"}
                  </span>
                  <span className="invite-count">
                    <span className="invite-mobile-label">Invites logged</span>
                    {c.invitations.filter((i) => !i.voided).length}
                  </span>
                  <span className="invite-count">
                    <span className="invite-mobile-label">Attended</span>
                    {c.attendance.length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!filtered.length && (
            <p className="invite-empty">
              {initial.length
                ? "No people match this search."
                : "Add your first person to start an invitation history."}
            </p>
          )}
          <p className="invite-list-foot">
            {filtered.length} {filtered.length === 1 ? "person" : "people"}{" "}
            shown · Invitations are logged manually.
          </p>
        </section>
        <aside className="invite-detail" aria-label="Person details">
          {person ? (
            <>
              <button className="invite-back" onClick={() => setSelected(null)}>
                <ArrowLeft size={16} />
                Back to people
              </button>
              <header>
                <div>
                  <h2>{person.name}</h2>
                  <p>
                    {relationships[person.relationship]} ·{" "}
                    {statuses[person.status]}
                    {person.location && (
                      <>
                        {" "}
                        · {person.location} · {locations[person.location]}
                      </>
                    )}
                  </p>
                </div>
                <button
                  className="invite-text-button"
                  onClick={() => setContactForm(person)}
                >
                  Edit
                </button>
              </header>
              {(person.email || person.phone) && (
                <p className="invite-contact-details">
                  {person.email && <span>{person.email}</span>}
                  {person.phone && <span>{person.phone}</span>}
                </p>
              )}
              <section className="invite-next">
                <h3>Next conversation</h3>
                <p>
                  {person.next_step ||
                    "What would be useful to talk about next?"}
                </p>
                <small>
                  {person.follow_up_on
                    ? `Follow up ${date(person.follow_up_on)}`
                    : "No follow-up date set"}
                </small>
              </section>
              <dl className="invite-context">
                <div>
                  <dt>Interests / what they need</dt>
                  <dd>{person.interests || "Not noted yet"}</dd>
                </div>
                <div>
                  <dt>How we could help each other</dt>
                  <dd>{person.collaboration || "Not noted yet"}</dd>
                </div>
                {person.context && (
                  <div>
                    <dt>Conversation notes</dt>
                    <dd>{person.context}</dd>
                  </div>
                )}
              </dl>
              <section className="invite-history">
                <header>
                  <h3>
                    Invitations{" "}
                    <span>
                      {person.invitations.filter((i) => !i.voided).length}
                    </span>
                  </h3>
                  <button
                    className="invite-text-button"
                    disabled={person.status === "do_not_contact"}
                    onClick={() => setInviteForm({ person, entry: null })}
                  >
                    <Plus size={14} />
                    Log invitation
                  </button>
                </header>
                {person.status === "do_not_contact" && (
                  <p>Do not contact is set. New invitations are paused.</p>
                )}
                {!person.invitations.length && (
                  <p>
                    No invitation history logged. Attendance doesn’t imply when
                    or how an invitation was made.
                  </p>
                )}
                <ol>
                  {person.invitations.map((i) => (
                    <li key={i.id} className={i.voided ? "invite-voided" : ""}>
                      <div>
                        <MessageCircle size={16} />
                        <strong>{i.event_label || "Invitation"}</strong>
                        <button
                          className="invite-text-button"
                          onClick={() => setInviteForm({ person, entry: i })}
                        >
                          Edit
                        </button>
                      </div>
                      <p>
                        {i.invited_on
                          ? date(i.invited_on)
                          : "Invitation date not recorded"}{" "}
                        ·{" "}
                        {i.channel
                          ? channels[i.channel]
                          : "Channel not recorded"}{" "}
                        ·{" "}
                        {i.voided
                          ? "Removed from count"
                          : responses[i.response]}
                      </p>
                      {i.notes && <p>{i.notes}</p>}
                    </li>
                  ))}
                </ol>
              </section>
              <section className="invite-history">
                <header>
                  <h3>
                    Attendance <span>{person.attendance.length}</span>
                  </h3>
                </header>
                {!person.attendance.length && (
                  <p>No verified attendance yet.</p>
                )}
                <ol>
                  {person.attendance.map((a) => (
                    <li key={a.ref}>
                      <div>
                        <Check size={16} />
                        <strong>{a.title}</strong>
                      </div>
                      <p>
                        {a.date ? date(a.date) : "Date not recorded"} ·{" "}
                        {a.source === "historical"
                          ? "Historical attendance confirmed"
                          : "Checked in"}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>
            </>
          ) : (
            <div className="invite-detail-empty">
              <h2>A useful next conversation.</h2>
              <p>
                Choose a person to see their invitation history, attendance and
                where you could help each other.
              </p>
              <p>
                Potential collaboration is your own assessment. No automatic
                ranking.
              </p>
            </div>
          )}
        </aside>
      </div>
      {contactForm !== undefined && (
        <ContactEditor
          contact={contactForm}
          save={saveRequest}
          close={() => setContactForm(undefined)}
          saved={refresh}
        />
      )}
      {inviteForm && (
        <InvitationEditor
          person={inviteForm.person}
          entry={inviteForm.entry}
          save={saveRequest}
          close={() => setInviteForm(null)}
          saved={refresh}
        />
      )}
    </>
  );
}
function Editor({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="invite-dialog"
      aria-label={title}
      onCancel={close}
    >
      <header>
        <h2>{title}</h2>
        <button type="button" onClick={close} aria-label="Close editor">
          ×
        </button>
      </header>
      {children}
    </dialog>
  );
}
function ContactEditor({
  contact,
  save,
  close,
  saved,
}: {
  contact: Contact | null;
  save: Write;
  close: () => void;
  saved: () => void;
}) {
  const id = useRef(contact?.id || crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await save({
        action: "contact",
        id: id.current,
        revision: contact?.revision || 0,
        name: f.get("name"),
        email: String(f.get("email") || "")
          .trim()
          .toLowerCase(),
        phone: f.get("phone"),
        location: f.get("location") || null,
        interests: f.get("interests"),
        context: f.get("context"),
        collaboration: f.get("collaboration"),
        next_step: f.get("next_step"),
        follow_up_on: f.get("follow_up_on") || null,
        relationship: f.get("relationship"),
        status: f.get("status"),
        priority: f.get("priority") === "on",
      });
      saved();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Editor title={contact ? "Edit person" : "Add person"} close={close}>
      <form onSubmit={submit}>
        <label>
          Name
          <input
            name="name"
            autoComplete="off"
            required
            maxLength={160}
            defaultValue={contact?.name || ""}
          />
        </label>
        <div className="invite-form-pair">
          <label>
            Email
            <input
              name="email"
              type="email"
              maxLength={254}
              defaultValue={contact?.email || ""}
            />
          </label>
          <label>
            Phone
            <input
              name="phone"
              type="tel"
              maxLength={40}
              defaultValue={contact?.phone || ""}
            />
          </label>
        </div>
        <label>
          Location
          <select name="location" defaultValue={contact?.location || ""}>
            <option value="">Not set</option>
            {Object.entries(locations).map(([code, label]) => (
              <option key={code} value={code}>
                {code} · {label}
              </option>
            ))}
          </select>
        </label>
        <div className="invite-form-pair">
          <label>
            Relationship
            <select
              name="relationship"
              defaultValue={contact?.relationship || "getting_to_know"}
            >
              {Object.entries(relationships).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Contact preference
            <select name="status" defaultValue={contact?.status || "active"}>
              {Object.entries(statuses).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Interests / what they need
          <textarea
            name="interests"
            rows={2}
            maxLength={2000}
            defaultValue={contact?.interests || ""}
          />
        </label>
        <label>
          How we could help each other
          <textarea
            name="collaboration"
            rows={2}
            maxLength={2000}
            defaultValue={contact?.collaboration || ""}
          />
        </label>
        <label>
          Conversation notes
          <textarea
            name="context"
            rows={3}
            maxLength={4000}
            defaultValue={contact?.context || ""}
          />
        </label>
        <label>
          Next step
          <input
            name="next_step"
            maxLength={500}
            defaultValue={contact?.next_step || ""}
          />
        </label>
        <label>
          Follow-up date
          <input
            type="date"
            name="follow_up_on"
            defaultValue={contact?.follow_up_on || ""}
          />
        </label>
        <label className="invite-check">
          <input
            type="checkbox"
            name="priority"
            defaultChecked={contact?.priority || false}
          />
          Priority for my next conversations
        </label>
        {error && <p role="alert">{error}</p>}
        <footer>
          <button type="button" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button className="invite-primary" disabled={busy}>
            {busy ? "Saving…" : "Save person"}
          </button>
        </footer>
      </form>
    </Editor>
  );
}
function InvitationEditor({
  person,
  entry,
  save,
  close,
  saved,
}: {
  person: InviteContact;
  entry: Invitation | null;
  save: Write;
  close: () => void;
  saved: () => void;
}) {
  const id = useRef(entry?.id || crypto.randomUUID()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await save({
        action: "invitation",
        id: id.current,
        contact_id: person.id,
        revision: entry?.revision || 0,
        invited_on: f.get("invited_on") || null,
        event_label: f.get("event_label"),
        channel: f.get("channel") || null,
        response: f.get("response"),
        notes: f.get("notes"),
        voided: f.get("voided") === "on",
      });
      saved();
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save unavailable.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Editor title={`Invitation · ${person.name}`} close={close}>
      <form onSubmit={submit}>
        <label>
          Date invited (optional)
          <input
            name="invited_on"
            type="date"
            max={singaporeToday()}
            defaultValue={entry?.invited_on || ""}
          />
        </label>
        <label>
          Event or reason
          <input
            name="event_label"
            maxLength={200}
            placeholder="e.g. 19 November AI session"
            defaultValue={entry?.event_label || ""}
          />
        </label>
        <div className="invite-form-pair">
          <label>
            How I invited
            <select name="channel" defaultValue={entry?.channel || ""}>
              <option value="">Not recorded</option>
              {Object.entries(channels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Response
            <select
              name="response"
              defaultValue={entry?.response || "awaiting_reply"}
            >
              {Object.entries(responses).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          What we discussed
          <textarea
            name="notes"
            rows={4}
            maxLength={2000}
            defaultValue={entry?.notes || ""}
          />
        </label>
        {entry && (
          <label className="invite-check">
            <input
              type="checkbox"
              name="voided"
              defaultChecked={entry.voided}
            />
            Remove this entry from invitation counts
          </label>
        )}
        <p className="invite-helper">
          Leave the date or channel blank if unknown. Logging does not send a
          message.
        </p>
        {error && <p role="alert">{error}</p>}
        <footer>
          <button type="button" onClick={close} disabled={busy}>
            Cancel
          </button>
          <button className="invite-primary" disabled={busy}>
            {busy ? "Saving…" : "Save invitation"}
          </button>
        </footer>
      </form>
    </Editor>
  );
}
