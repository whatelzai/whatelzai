"use client";
import Link from "next/link";
import { WhatelzMark } from "@/components/brand/WhatelzMark";
import { usePathname } from "next/navigation";
export function SiteFooter({ ownerName }: { ownerName: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <footer className="editorial-footer focused-footer">
      <div className="field-wrap">
        <div className="footer-top">
          <div>
            <h2>See you on Thursday.</h2>
            <Link href="/events" className="text-link">
              Explore events ↗
            </Link>
          </div>
          <nav aria-label="Footer navigation">
            <Link href="/events">Events</Link>
            <Link href="/playbook">The book</Link>
            <Link href="/about">My why</Link>
            <Link href="/testimonials">Testimonials</Link>
            <Link href="/contact">Say hello ↗</Link>
          </nav>
          <nav aria-label="Social links">
            <a
              href="https://www.instagram.com/whatelz.ai/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram ↗
            </a>
            <a
              href="https://www.linkedin.com/in/whatelzai/"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn ↗
            </a>
            <a
              href="https://www.youtube.com/@whatelzai"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube ↗
            </a>
            <a
              href="https://medium.com/@whatelz.ai"
              target="_blank"
              rel="noopener noreferrer"
            >
              Medium ↗
            </a>
            <Link href="/channels">All channels →</Link>
          </nav>
        </div>
        <Link
          href="/"
          className="footer-wordmark whatelz-brand-lockup"
          aria-label="whatelz.ai home"
        >
          <WhatelzMark className="whatelz-brand-symbol" />
          whatelz.ai
        </Link>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {ownerName}
          </span>
          <span>Money Mindset × AI Skillset</span>
          <span>Built with curiosity. In Singapore.</span>
        </div>
      </div>
    </footer>
  );
}
