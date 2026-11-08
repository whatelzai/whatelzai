// The series is weekly; only this occurrence is currently planned.
export const mapEvent = {
  title: "Millionair’s AI Playbook",
  shortName: "M.A.P.",
  subtitle: "AI Skillset × Money Mindset",
  path: "/events/millionairs-ai-playbook",
  startsAt: "2026-11-12T19:30:00+08:00",
  endsAt: "2026-11-12T21:30:00+08:00",
  dateLabel: "Thursday, 12 November 2026",
  timeLabel: "7:30–9:30 PM · UTC+8",
  capacity: 20,
  price: "S$97",
  checkoutUrl: "https://buy.stripe.com/14AfZj8SR5os9tCeGyafS02",
} as const;
export function isMapRegistrationOpen(now = Date.now()) {
  return now < Date.parse(mapEvent.startsAt);
}
