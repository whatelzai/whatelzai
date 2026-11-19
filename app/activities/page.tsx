import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Coffee, Sparkles, Users } from "lucide-react";
import {
  getActivitySchedule,
  activityDate,
  activityStatus,
} from "@/content/activities";
import "./activities.css";

export const metadata: Metadata = {
  title: "Activities",
  description:
    "Meet people curious about AI. Explore practical ideas, try something together and make a little progress with Edmund in Singapore.",
  alternates: { canonical: "/activities" },
};
export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const { now, upcoming, planning, past } = getActivitySchedule();
  return (
    <main className="activities-page">
      <header className="activity-hero field-wrap">
        <div>
          <p className="field-eyebrow">Activities / Singapore</p>
          <h1>
            Good company.
            <br />A little <span>AI curiosity.</span>
          </h1>
          <p>
            Let’s step away from the feed and try something together. Small
            gatherings, useful experiments and time to get to know each other.
          </p>
          <a href="#gatherings" className="field-button">
            Find your next gathering{" "}
            <ArrowUpRight size={20} aria-hidden="true" />
          </a>
        </div>
        <div
          className="activity-poster"
          aria-label="Come curious. Try something. Meet good people."
        >
          <Coffee size={62} strokeWidth={1.4} aria-hidden="true" />
          <p>
            Come curious.
            <br />
            Try something.
            <br />
            <em>Meet good people.</em>
          </p>
          <span>
            With Edmund · Whatelz.ai <Sparkles size={20} aria-hidden="true" />
          </span>
        </div>
      </header>
      <section
        id="gatherings"
        className="field-wrap activity-list"
        aria-labelledby="gatherings-heading"
      >
        <div className="activity-section-heading">
          <h2 id="gatherings-heading">Around the table.</h2>
          <p>Small enough for everyone to be part of the conversation.</p>
        </div>
        {upcoming.length === 0 && (
          <p className="activity-notice">
            The first gathering is taking shape. Dates and the venue will be
            announced here once confirmed.
          </p>
        )}
        {[
          ...upcoming.sort(
            (a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!),
          ),
          ...planning,
        ].map((a) => (
          <article key={a.slug} className="activity-card">
            <div className="activity-card-mark">
              <Coffee size={50} strokeWidth={1.2} aria-hidden="true" />
              <span>
                {activityStatus(a, now) === "planning"
                  ? "In the making"
                  : "Coming up"}
              </span>
            </div>
            <div>
              <p className="field-eyebrow">
                {activityStatus(a, now) !== "planning" && a.startsAt
                  ? `${activityDate(a.startsAt)} · SGT`
                  : "First gathering · Details to come"}
              </p>
              <h3>
                <Link href={`/activities/${a.slug}`}>
                  {a.title}
                  <ArrowUpRight size={26} aria-hidden="true" />
                </Link>
              </h3>
              <p className="activity-theme">{a.theme}</p>
              <p>{a.summary}</p>
              <div className="activity-card-footer">
                <span>
                  <Users size={16} aria-hidden="true" />
                  {a.groupSize}
                </span>
                <Link className="text-link" href={`/activities/${a.slug}`}>
                  Explore the activity{" "}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
      <section
        className="activity-welcome field-wrap"
        aria-labelledby="welcome-heading"
      >
        <h2 id="welcome-heading">You don’t have to be “the tech person.”</h2>
        <div>
          <p>
            You might be AI-curious, have a question you’ve never asked, or want
            company while you start something. There’s room for all of that.
          </p>
          <p>
            No coding experience or paid AI subscription needed. We can try
            things individually or in pairs, at a comfortable pace.
          </p>
        </div>
      </section>
      {past.length > 0 && (
        <section
          className="field-wrap activity-list"
          aria-labelledby="past-heading"
        >
          <h2 id="past-heading">Previously, together.</h2>
          {past.map((a) => (
            <article key={a.slug} className="activity-past">
              <p className="field-eyebrow">{activityDate(a.startsAt!)} · SGT</p>
              <h3>
                <Link href={`/activities/${a.slug}`}>
                  {a.title} <ArrowUpRight size={20} aria-hidden="true" />
                </Link>
              </h3>
              <p>{a.summary}</p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
