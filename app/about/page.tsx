import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSiteIdentity } from "@/lib/site-identity";
import { Eyebrow } from "@/components/editorial/FieldElements";
export const metadata: Metadata = {
  title: "The person behind the playbook",
  description:
    "Meet Edmund, an AI builder documenting his own solopreneur journey through Money Mindset and AI Skillset.",
  alternates: { canonical: "https://whatelz.ai/about" },
};
export default async function AboutPage() {
  const s = await getSiteIdentity();
  return (
    <main>
      <section className="field-wrap about-intro">
        <div className="about-photo">
          {s.portrait_url && (
            <Image
              src={s.portrait_url}
              alt={s.owner_name}
              fill
              sizes="(max-width:700px) 85vw, 45vw"
              priority
            />
          )}
        </div>
        <div>
          <Eyebrow>05 / The person behind the pages</Eyebrow>
          <h1>
            Hey, I’m {s.owner_first_name}.<br />
            <em>Still becoming.</em>
          </h1>
          <p>
            I’m an AI builder based in Singapore and co-founder of AI System
            Resources. Right now, I’m also learning what it takes to make it as
            a solopreneur.
          </p>
          <p>
            Whatelz.ai is where I share that process: the mindset I’m working
            on, the skills I’m developing and the things I’m actually building.
          </p>
          <p>
            The playbook comes from my own practice. I’m its first reader, its
            first experiment and, quite often, the person who needs the
            reminder.
          </p>
          <Link href="/playbook" className="text-link">
            See what I’m learning <span>↗</span>
          </Link>
        </div>
      </section>
      <section className="quote-interlude about-quote">
        <div className="field-wrap">
          <Eyebrow>Why share the journey?</Eyebrow>
          <blockquote>
            “I cannot expect people to do something
            <br />
            <em>that I never tried nor dared to do.”</em>
          </blockquote>
          <span>— The standard I’m trying to hold myself to.</span>
        </div>
      </section>
      <section className="field-section field-wrap">
        <div className="section-heading">
          <Eyebrow>How I’m approaching it</Eyebrow>
          <h2>
            A few things
            <br />
            <em>I’m choosing to practise.</em>
          </h2>
        </div>
        <div className="about-principles">
          {[
            [
              "01",
              "Own the ambition.",
              "Work on the beliefs behind the decisions. Money Mindset means getting more intentional about value, selling, priorities and what I want to build.",
            ],
            [
              "02",
              "Make the idea real.",
              "AI Skillset means learning by doing. Build the tool, try the workflow, ship the first version. Then pay attention to what actually helps.",
            ],
            [
              "03",
              "Leave the notes open.",
              "Share the useful lessons while they’re still fresh. The playbook will keep changing as I read more, build more and understand more.",
            ],
          ].map(([n, title, body]) => (
            <article key={n}>
              <span>{n}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="field-section field-wrap" style={{ paddingTop: 0 }}>
        <div className="section-heading">
          <Eyebrow>The longer story</Eyebrow>
          <h2>
            There’s more
            <br />
            <em>between the lines.</em>
          </h2>
        </div>
        <div className="story-paths">
          {[
            ["/projects", "What I’m building"],
            ["/career", "Where I’ve worked"],
            ["/hackathons", "The experiments & teams"],
            ["/mentorship", "People I’ve learned from"],
            ["/leadership", "Communities I’ve grown with"],
            ["/testimonials", "Their side of the story"],
          ].map(([href, title]) => (
            <Link href={href} key={href}>
              {title}
              <span>↗</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
