// The series is weekly; only this occurrence has a confirmed venue.
export const mapEvent = {
  title: "Money Mindset × AI Skillset",
  shortName: "Money Mindset × AI Skillset",
  subtitle: "AI Skillset × Money Mindset",
  path: "/events/money-mindset-ai-skillset",
  startsAt: "2026-11-12T19:30:00+08:00",
  endsAt: "2026-11-12T21:30:00+08:00",
  dateLabel: "Thursday, 12 November 2026",
  timeLabel: "7:30–9:30 PM · UTC+8",
  venue: "The Vibe",
  address: "Paya Lebar Square #07-16, Singapore 409051",
  venueUrl: "https://thevibe.sg",
  capacity: 20,
  price: "S$97",
  checkoutUrl: "https://buy.stripe.com/14AfZj8SR5os9tCeGyafS02",
} as const;
export function isMapRegistrationOpen(now = Date.now()) {
  return now < Date.parse(mapEvent.startsAt);
}
