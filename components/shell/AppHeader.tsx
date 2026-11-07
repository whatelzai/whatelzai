"use client";
import Link from "next/link";
import { WhatelzMark } from "@/components/brand/WhatelzMark";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const navigation = [
  ["/about", "My why"],
  ["/testimonials", "Testimonials"],
  ["/events", "M.A.P. events"],
  ["/playbook", "The book"],
];
export function AppHeader() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <header className="editorial-header focused-header">
      <a className="skip-link" href="#site-content">
        Skip to content
      </a>
      <div className="header-inner">
        <Link
          href="/"
          className="wordmark whatelz-brand-lockup"
          aria-label="whatelz.ai home"
        >
          <WhatelzMark className="whatelz-brand-symbol" />
          whatelz.ai
        </Link>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                pathname === href || pathname.startsWith(href + "/")
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
