import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { siteSurface } from "@/lib/domain-routing";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import "./editorial.css";
import "./themes.css";
import { ShellProvider } from "@/components/shell/ShellProvider";
import { getSiteIdentity } from "@/lib/site-identity";
import { ensureUserRow } from "@/lib/users";
import { isOwnerUser } from "@/lib/admin-policy";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fraunces — variable serif with SOFT + opsz axes. Distinctive editorial warmth
// against Geist Sans/Mono. Used sparingly on Tier-1 display moments only.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "opsz"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const SITE_URL = "https://whatelz.ai";
const SITE_NAME = "whatelz.ai";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const surface = siteSurface(requestHeaders.get("host") ?? "");
  if (surface !== "public") {
    return {
      title: surface === "admin" ? "Whatelz Admin" : "fcOS",
      ...(surface === "app"
        ? {
            applicationName: "fcOS",
            manifest: "/fcos/app.webmanifest",
            appleWebApp: {
              capable: true,
              title: "fcOS",
              statusBarStyle: "default" as const,
            },
            icons: { icon: "/fcos/icon-192.png", apple: "/fcos/icon-180.png" },
          }
        : {
            applicationName: "Whatelz Admin",
            manifest: "/admin-pwa/app.webmanifest",
            appleWebApp: {
              capable: true,
              title: "Whatelz Admin",
              statusBarStyle: "default" as const,
            },
            icons: {
              icon: [
                { url: "/brand/icon.svg", type: "image/svg+xml" },
                {
                  url: "/admin-pwa/icon-192-v2.png",
                  sizes: "192x192",
                  type: "image/png",
                },
              ],
              apple: "/admin-pwa/icon-180-v2.png",
            },
          }),
      robots: { index: false, follow: false },
    };
  }
  const s = await getSiteIdentity();
  const title = `${SITE_NAME} — The solopreneur’s playbook`;
  const description =
    "Money Mindset × AI Skillset. Field notes on building a life and business of your own, by " +
    s.owner_name +
    ".";
  const ogSubtitle = `Money Mindset × AI Skillset — ${s.owner_name}`;
  const ogImage = `${SITE_URL}/api/og?title=${encodeURIComponent(SITE_NAME)}&subtitle=${encodeURIComponent(ogSubtitle)}`;
  const [firstName, ...rest] = s.owner_name.split(" ");
  const lastName = rest.join(" ");

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s — ${SITE_NAME}`,
    },
    description,
    keywords: [
      "AI engineer",
      "build with AI",
      "what else can you build with AI",
      "AI systems",
      "production AI",
      "AI training",
      "landing pages Next.js",
      s.owner_name,
      "whatelz",
      "ATLAS trading AI",
      "DoubleLead CRM",
      "EMDEE knowledge graph",
    ],
    applicationName: SITE_NAME,
    icons: {
      icon: [
        { url: "/brand/icon.svg", type: "image/svg+xml" },
        { url: "/brand/icon-32.png", sizes: "32x32", type: "image/png" },
      ],
      apple: "/brand/icon-180.png",
    },
    authors: [{ name: s.owner_name, url: SITE_URL }],
    creator: s.owner_name,
    openGraph: {
      type: "profile",
      url: SITE_URL,
      title,
      description,
      siteName: SITE_NAME,
      firstName,
      lastName,
      username: "whatelzai",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${SITE_NAME} — ${s.owner_name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@whatelzai",
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
      },
    },
  };
}

// Syncs the verified Supabase account and exposes admin navigation only to
// the configured owner. New sign-ins never acquire administrative access.
async function getIsAdmin(): Promise<boolean> {
  try {
    const user = await ensureUserRow();
    return isOwnerUser(user);
  } catch {
    return false;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const surface = siteSurface(requestHeaders.get("host") ?? "");
  // The member shell uses neither public identity nor the public admin-link flag.
  // Keep its loading boundary free of these reads; protected pages verify identity.
  const [isAdmin, s] =
    surface === "app"
      ? ([false, null] as const)
      : await Promise.all([getIsAdmin(), getSiteIdentity()]);

  const jsonLd = s
    ? {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Person",
            "@id": `${SITE_URL}/#person`,
            name: s.owner_name,
            url: SITE_URL,
            jobTitle: "AI Solopreneur & Builder",
            description:
              s.meta_description ??
              "AI engineer and founder building AI systems.",
            sameAs: [
              "https://www.instagram.com/whatelz.ai/",
              s.linkedin_url,
              "https://www.youtube.com/@whatelzai",
              "https://medium.com/@whatelz.ai",
              "https://github.com/whatelzai",
            ].filter(Boolean),
            knowsAbout: [
              "Artificial Intelligence",
              "AI Systems Engineering",
              "Large Language Models",
              "Retrieval-Augmented Generation",
              "Next.js",
              "TypeScript",
              "Supabase",
              "AI Training",
            ],
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}/#website`,
            url: SITE_URL,
            name: SITE_NAME,
            description:
              "The solopreneur’s playbook. Money Mindset × AI Skillset.",
            author: { "@id": `${SITE_URL}/#person` },
          },
        ],
      }
    : null;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t;try{t=localStorage.getItem('whatelz-theme-v1')}catch(e){}document.documentElement.dataset.theme=t==='light'||t==='dark'?t:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'})()`,
          }}
        />
        {jsonLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
        )}
      </head>
      <body className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
        <ShellProvider
          isAdmin={isAdmin}
          ownerName={s?.owner_name ?? "fcOS"}
          surface={surface}
        >
          {children}
        </ShellProvider>
      </body>
    </html>
  );
}
