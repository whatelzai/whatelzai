// Historical dates, venue and participant count supplied by Edmund.
// Posters are designed from his supplied portraits, not dated documentary photos.
export const pastThursdayEvents = [
  {
    date: "2026-11-05",
    label: "5 November 2026",
    poster: "/images/events/past-2026-11-05.png",
  },
  {
    date: "2026-10-29",
    label: "29 October 2026",
    poster: "/images/events/past-2026-10-29.png",
  },
  {
    date: "2026-10-22",
    label: "22 October 2026",
    poster: "/images/events/past-2026-10-22.png",
  },
].map((event) => ({
  ...event,
  title: "Money Mindset × AI Skillset",
  venue: "ELZ’s Hideout",
  participants: 10,
  path: `/events/${event.date}`,
}));
