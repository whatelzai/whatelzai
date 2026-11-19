import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BookObject } from "@/components/editorial/FieldElements";
import chapters from "@/content/playbook/chapters.json";

export const metadata: Metadata = {
  title: "The Money & AI Playbook",
  description:
    "Money Mindset × AI Skillset. The Money & AI Playbook by Edmund. S$47 for digital access, including future updates.",
  alternates: { canonical: "https://whatelz.ai/playbook" },
};
export default function PlaybookPage() {
  return (
    <main className="book-sales field-wrap">
      <section className="book-sales-hero">
        <div className="offer-copy">
          <p className="offer-label">By Edmund Lin Zhenming</p>
          <h1>
            The Money &amp; AI
            <br />
            Playbook.
          </h1>
          <p>
            Money mindset. AI skillset. Practical lessons for building your own way.
          </p>
          <p className="book-sales-price">
            S$47 <span>One payment · digital access</span>
          </p>
          <a
            className="field-button"
            href="https://buy.stripe.com/bJeeVfd973gk35edCuafS03"
          >
            Get the Playbook <ArrowUpRight size={20} />
          </a>
          <p className="booking-note">
            Have a promo code? Apply it at checkout.
          </p>
          <Link className="text-link" href="/playbook/read">
            Already have access? Read your book →
          </Link>
        </div>
        <div className="offer-book-object">
          <BookObject href="/playbook/read" />
        </div>
      </section>
      <section className="book-contents" aria-labelledby="contents-heading">
        <div>
          <h2 id="contents-heading">Inside the book.</h2>
          <p>
            Twelve chapters, with more lessons to come. Your access includes
            future updates.
          </p>
          <p>
            The Thursday seminars are where I teach and develop ideas
            that will become part of this book.
          </p>
          <Link href="/events" className="text-link">
            Join a Thursday seminar ↗
          </Link>
        </div>
        <ol>
          {chapters.map((chapter) => (
            <li key={chapter.slug}>{chapter.title}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
