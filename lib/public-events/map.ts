// The series is weekly; only this occurrence has a confirmed venue.
export const mapEvent = {
  title: "Millionair’s AI Playbook",
  shortName: "M.A.P.",
  subtitle: "AI Skillset × Money Mindset",
  path: "/events/millionairs-ai-playbook",
  startsAt: "2026-11-12T19:30:00+08:00",
  endsAt: "2026-11-12T21:30:00+08:00",
  dateLabel: "Thursday, 12 November 2026",
  timeLabel: "7:30–9:30 PM · UTC+8",
  venue: "Wings of the Dawn Meeting Room",
  address: "Blk 712 Ang Mo Kio Avenue 6, #03-4056, Singapore 560712",
  venueUrl: "https://www.tagvenue.com/sg/rooms/singapore/42063/wings-of-the-dawn/wings-of-the-dawn-meeting-room",
  capacity: 20,
  price: "S$97",
  checkoutUrl: "https://buy.stripe.com/14AfZj8SR5os9tCeGyafS02",
} as const;
export function isMapRegistrationOpen(now = Date.now()) {
  return now < Date.parse(mapEvent.startsAt);
}
