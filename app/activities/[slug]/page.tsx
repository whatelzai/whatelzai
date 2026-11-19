import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Coffee } from "lucide-react";
import { activities, activityDate, activityStatus } from "@/content/activities";
import { ContactForm } from "@/components/sections/contact-form";
import { getSiteIdentity } from "@/lib/site-identity";
import "../activities.css";

type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const activity = activities.find((a) => a.slug === slug);
  if (!activity) return { title: "Activity not found" };
  return {
    title: activity.title,
    description: activity.summary,
    alternates: { canonical: `/activities/${slug}` },
  };
}
export default async function ActivityPage({ params }: Props) {
  const { slug } = await params;
  const activity = activities.find((a) => a.slug === slug);
  if (!activity) notFound();
  const site = await getSiteIdentity();
  const status = activityStatus(activity);
  const registrationUrl =
    status === "upcoming" ? activity.registrationUrl : null;
  return (
    <main className="activities-page field-wrap activity-detail">
      <Link href="/activities" className="text-link">
        <ArrowLeft size={18} aria-hidden="true" />
        All activities
      </Link>
      <header className="activity-detail-header">
        <p className="field-eyebrow">
          {status === "planning"
            ? "In the making"
            : status === "past"
              ? "Past gathering"
              : "Coming up"}{" "}
          / Singapore
        </p>
        <h1>
          {activity.title}
          <Coffee size={52} aria-hidden="true" />
        </h1>
        <p>{activity.theme}</p>
      </header>
      <div className="activity-detail-grid">
        <div>
          <h2>A little progress. Together.</h2>
          <p>{activity.description}</p>
          <h2>What we’ll do</h2>
          <ol className="activity-agenda">
            <li>
              <strong>Get to know each other.</strong> Coffee, introductions and
              the thing you’ve been putting off.
            </li>
            <li>
              <strong>See something useful.</strong> A short, practical AI
              demonstration from Edmund.
            </li>
            <li>
              <strong>Have a go.</strong> Try a small task, ask questions and
              help each other.
            </li>
            <li>
              <strong>Share and hang out.</strong> What worked, what surprised
              you, and what you might try next.
            </li>
          </ol>
          <h2>Bring your curiosity.</h2>
          <p>
            A phone or laptop is welcome, but optional. You don’t need coding
            experience or a paid AI account. Pick a task you’re comfortable
            exploring with others; a useful first step is plenty.
          </p>
        </div>
        <aside className="activity-facts" aria-label="Gathering details">
          <h2>The little details.</h2>
          <dl>
            <div>
              <dt>When</dt>
              <dd>
                {status !== "planning" && activity.startsAt
                  ? `${activityDate(activity.startsAt)} · SGT`
                  : "Date to be announced"}
              </dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>
                {activity.location ?? "Singapore · Venue to be announced"}
              </dd>
            </div>
            <div>
              <dt>Time together</dt>
              <dd>{activity.duration}</dd>
            </div>
            <div>
              <dt>People</dt>
              <dd>{activity.groupSize}</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>{activity.language}</dd>
            </div>
            <div>
              <dt>Cost</dt>
              <dd>
                {activity.price ??
                  "To be confirmed, including any café purchase"}
              </dd>
            </div>
          </dl>
          {status !== "past" && (
            <a className="field-button" href={registrationUrl ?? "#interest"}>
              {registrationUrl ? "Register" : "I’m interested"}
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          )}
        </aside>
      </div>
      {status !== "past" && !registrationUrl && (
        <section
          id="interest"
          className="activity-interest"
          aria-labelledby="interest-heading"
        >
          <div>
            <p className="field-eyebrow">Let’s stay in touch</p>
            <h2 id="interest-heading">Pull up a chair?</h2>
            <p>
              Tell me what you’d like to explore. I’ll get back to you about the
              gathering once the details are ready.
            </p>
            <p className="activity-small">
              This is an expression of interest, not a confirmed booking. Your
              email is used to reply about this activity.
            </p>
          </div>
          <ContactForm
            fallbackEmail={site.email}
            initialMessage={`I’m interested in ${activity.title}. Something I’d like to explore is: `}
            submitLabel="Send my interest"
            successMessage="Thanks for your interest. I’ll reply about the gathering once the details are ready."
          />
        </section>
      )}
      {status === "past" && (
        <p className="activity-notice">
          This gathering has ended.{" "}
          <Link href="/activities">See what’s next.</Link>
        </p>
      )}
    </main>
  );
}
