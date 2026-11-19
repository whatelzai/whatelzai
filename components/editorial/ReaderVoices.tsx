"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
export type ReaderVoice = {
  name: string;
  role: string;
  quote: string;
  avatar: string | null;
  href: string;
};
export function ReaderVoices({ voices }: { voices: ReaderVoice[] }) {
  const [index, setIndex] = useState(0);
  if (!voices.length) return null;
  const voice = voices[index];
  return (
    <section
      className="voices-section field-wrap"
      id="testimonials"
      data-section="What people say"
    >
      <div className="voices-intro">
        <h2>
          In their
          <br />
          own words.
        </h2>
        <Link href="/testimonials" className="text-link">
          All testimonials <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="voice-panel">
        <div aria-live="polite" aria-atomic="true">
          <blockquote>
            <p>“{voice.quote}”</p>
          </blockquote>
          <div className="voice-person">
            {voice.avatar && (
              <Image src={voice.avatar} alt="" width={56} height={56} />
            )}
            <div>
              <strong>{voice.name}</strong>
              <span>{voice.role}</span>
            </div>
          </div>
        </div>
        <div className="voice-controls">
          <Link href={voice.href} className="text-link">
            Read full testimonial <ArrowUpRight size={18} />
          </Link>
          <div>
            <button
              type="button"
              aria-label="Previous testimonial"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              <ArrowLeft size={20} />
            </button>
            <button
              type="button"
              aria-label="Next testimonial"
              disabled={index === voices.length - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
