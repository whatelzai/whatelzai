// The series is weekly; only this occurrence has a confirmed venue.
export const mapEvent = {
  id: "ELZ-EVT-0004",
  poster: "/images/events/money-mindset-ai-skillset-nov12-offer.png",
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

// Retain mapEvent as the immutable 12 November occurrence for existing tickets.
export const currentEvent = {
  ...mapEvent,
  id: "ELZ-EVT-0005",
  key: "ai-skillset-money-mindset-20261119",
  path: "/events/2026-11-19",
  poster: "/images/events/money-mindset-ai-skillset-nov19-post.png",
  startsAt: "2026-11-19T19:30:00+08:00",
  endsAt: "2026-11-19T21:30:00+08:00",
  dateLabel: "Thursday, 19 November 2026",
  capacity: 30,
  price: "S$8",
  checkoutUrl: "/events/register?event=ELZ-EVT-0005",
} as const;
export type PublicSeminar = typeof mapEvent | typeof currentEvent;
export const seminarEvents: readonly PublicSeminar[] = [mapEvent, currentEvent];
export const seminarByKey = (key: string) =>
  seminarEvents.find((e) => e.key === key);
export const seminarById = (id: string) =>
  seminarEvents.find((e) => e.id === id);
export const registrationCookie = (event: PublicSeminar) =>
  event.id === mapEvent.id
    ? "whatelz_event_signup"
    : "whatelz_event_signup_nov19";
export const registrationPath = (event: PublicSeminar) =>
  `/events/register?event=${event.id}`;
export const isSeminarOpen = (event: PublicSeminar, now = Date.now()) =>
  now < Date.parse(event.startsAt);
