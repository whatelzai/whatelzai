// The series is weekly; only this occurrence has a confirmed venue.
export const mapEvent = {
  id: "ELZ-EVT-0004",
  key: "ai-skillset-money-mindset-20261112",
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
  originalPrice: "S$97",
  price: "S$7",
  checkoutUrl: "https://buy.stripe.com/3cIdRbedbeZ27luaqiafS04",
} as const;
export function isMapRegistrationOpen(now = Date.now()) {
  return now < Date.parse(mapEvent.startsAt);
}
