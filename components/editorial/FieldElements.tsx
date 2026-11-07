import Link from "next/link";
import { Asterisk, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="field-eyebrow">
      <span aria-hidden="true" />
      {children}
    </p>
  );
}

export function FieldHero({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  number?: string;
  children?: ReactNode;
}) {
  return (
    <header className="field-hero">
      <div className="field-wrap">
        <Eyebrow>{label}</Eyebrow>
        <div className="field-hero-row">
          <div>
            <h1>{title}</h1>
            {description && <p className="field-deck">{description}</p>}
            {children}
          </div>
        </div>
      </div>
    </header>
  );
}

export function BookObject({
  compact = false,
  href = "/playbook",
}: {
  compact?: boolean;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className={`book-object ${compact ? "book-compact" : ""}`}
      aria-label={
        href === "/playbook/read"
          ? "Open your Playbook reader"
          : "Open The Solopreneur’s Playbook"
      }
    >
      <span className="book-pages" aria-hidden="true" />
      <span className="book-face">
        <span className="book-top">
          WHATELZ.AI <span>BY EDMUND LIN ZHENMING</span>
        </span>
        <span className="book-title">
          The
          <br />
          Solopreneur’s
          <br />
          <em>Playbook.</em>
        </span>
        <span className="book-symbol" aria-hidden="true">
          <Asterisk size={80} strokeWidth={1} />
        </span>
        <span className="book-bottom">
          MONEY MINDSET
          <br />× AI SKILLSET<span>A FIELD GUIDE BY EDMUND</span>
        </span>
      </span>
      <span className="book-open">
        Open the playbook <ArrowUpRight size={18} aria-hidden="true" />
      </span>
    </Link>
  );
}

export function ContinueExploring() {
  return (
    <aside className="continue-exploring">
      <div className="field-wrap">
        <Eyebrow>There’s another chapter</Eyebrow>
        <div className="continue-row">
          <h2>
            Keep your curiosity.
            <br />
            <em>See where it takes you.</em>
          </h2>
          <div>
            <Link href="/playbook">
              Open the playbook <span>↗</span>
            </Link>
            <Link href="/this-week">
              Follow the journey <span>↗</span>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
