// IDs are permanent: never regenerate or reuse them when names/dates change.
// Historical dates, venue and participant count supplied by Edmund.
// Posters are designed from his supplied portraits, not dated documentary photos.
export const pastThursdayEvents = [
  {
    id: "ELZ-EVT-0003",
    date: "2026-11-05",
    label: "5 November 2026",
    poster: "/images/events/elz-evt-0003.png",
  },
  {
    id: "ELZ-EVT-0002",
    date: "2026-10-29",
    label: "29 October 2026",
    poster: "/images/events/elz-evt-0002.png",
  },
  {
    id: "ELZ-EVT-0001",
    date: "2026-10-22",
    label: "22 October 2026",
    poster: "/images/events/elz-evt-0001.png",
  },
].map((event) => ({
  ...event,
  title: "Money Mindset × AI Skillset",
  venue: "ELZ’s Hideout",
  participants: 10,
  path: `/events/${event.id}`,
}));
