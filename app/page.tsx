import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getSiteIdentity } from "@/lib/site-identity";
import { listFeaturedTestimonials, testimonialSlug } from "@/lib/testimonials";
import { BookObject } from "@/components/editorial/FieldElements";
import { ReaderVoices } from "@/components/editorial/ReaderVoices";
import { mapEvent, isMapRegistrationOpen } from "@/lib/public-events/map";
import "./offers.css";

export const metadata: Metadata = {
  title: { absolute: "whatelz.ai — Money Mindset × AI Skillset" },
  description:
    "Meet Edmund, join Millionair’s AI Playbook on Thursdays, and explore The Solopreneur’s Playbook. Money Mindset × AI Skillset.",
  alternates: { canonical: "https://whatelz.ai" },
};
export default async function Home() {
  const [site, testimonials] = await Promise.all([
    getSiteIdentity(),
    listFeaturedTestimonials(),
  ]);
  const voices = testimonials.slice(0, 5).map((t) => ({
    name: t.author_name,
    role: (t.author_affiliations ?? [])
      .map((a) => [a.role, a.company].filter(Boolean).join(", "))
      .join(" · "),
    quote: t.quote,
    avatar: t.author_avatar_url,
    href: `/testimonials/${testimonialSlug(t)}`,
  }));
  return (
    <main className="offer-home">
      <section className="offer-intro field-wrap">
        <h1>
          Money Mindset.
          <br />
          <span>AI Skillset.</span>
        </h1>
        <div className="offer-intro-bottom">
          <p>
            Learn with me on Thursdays.
            <br />
            Take the lessons into your own life.
          </p>
          <Link className="field-button" href="/events">
            Explore M.A.P. <ArrowUpRight size={20} />
          </Link>
        </div>
      </section>
      <section className="map-feature" aria-labelledby="map-heading">
        <div className="field-wrap map-feature-grid">
          <Image
            className="map-poster-photo"
            src="/images/events/map-edmund-poster-v1.png"
            alt="Millionair’s AI Playbook with Edmund Lin Zhenming: AI Skillset × Money Mindset, Thursdays 7:30–9:30 PM, 20 people, S$97."
            width={1122}
            height={1402}
            sizes="(max-width:700px) 100vw, 50vw"
          />
          <div className="offer-copy">
            <p className="offer-label">The Thursday seminar</p>
            <h2 id="map-heading">
              Millionair’s
              <br />
              AI Playbook.
            </h2>
            <p>
              Two hours exploring AI Skillset × Money Mindset, together. A small
              room, with space for questions.
            </p>
            <p className="offer-event-facts">
              {isMapRegistrationOpen()
                ? "Planned: 12 November"
                : "Next date to be announced"}
              <br />
              7:30–9:30 PM · 20 people · S$97
            </p>
            <Link className="field-button" href={mapEvent.path}>
              See the seminar <ArrowUpRight size={20} />
            </Link>
          </div>
        </div>
      </section>
      <section className="offer-book field-wrap" aria-labelledby="book-heading">
        <div className="offer-copy">
          <p className="offer-label">The book</p>
          <h2 id="book-heading">
            The Solopreneur’s
            <br />
            Playbook.
          </h2>
          <p>
            The ideas don’t end when the room clears. What I teach at M.A.P.
            will find its way into this book: lessons on money, AI and building
            something of your own.
          </p>
          <Link className="text-link" href="/playbook">
            Explore the book · S$47 <ArrowUpRight size={20} />
          </Link>
        </div>
        <div className="offer-book-object">
          <BookObject />
        </div>
      </section>
      <section className="offer-why" aria-labelledby="why-heading">
        <div className="field-wrap offer-why-grid">
          {site.portrait_url && (
            <div className="offer-portrait">
              <Image
                src={site.portrait_url}
                alt={site.owner_name}
                width={640}
                height={760}
                sizes="(max-width:700px) 100vw, 40vw"
              />
            </div>
          )}
          <div className="offer-copy">
            <p className="offer-label">Meet {site.owner_first_name}</p>
            <h2 id="why-heading">Why I’m doing this.</h2>
            <blockquote>
              “If you can give your company 100%, why not give yourself 100%?”
            </blockquote>
            <p>
              I’m Edmund, an AI builder in Singapore. I’m putting AI to work in
              my own life, sharing what I learn, and building the freedom to
              choose how I work.
            </p>
            <Link className="text-link" href="/about">
              Read my story <ArrowUpRight size={20} />
            </Link>
          </div>
        </div>
      </section>
      <ReaderVoices voices={voices} />
    </main>
  );
}
