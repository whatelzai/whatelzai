export interface Activity {
  slug: string;
  title: string;
  theme: string;
  summary: string;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  location: string | null;
  price: string | null;
  registrationUrl: string | null;
  groupSize: string;
  duration: string;
  language: string;
}

/** Public, reviewed copy only. Add an entry for each confirmed gathering.
 * Unscheduled concepts keep both dates null; never generate weekly dates. */
export const activities: Activity[] = [
  {
    slug: "coffee-and-ai",
    title: "Coffee & AI",
    theme: "Something you’ve been putting off.",
    summary:
      "Bring a little curiosity and an idea you’ve been meaning to start. Let’s make a first step together.",
    description:
      "A relaxed, hands-on gathering with Edmund and a few other people curious about AI. We’ll talk about what you’d like to do, try a useful example, and explore your own small task. You can join with a phone, a laptop, or simply your questions.",
    startsAt: null,
    endsAt: null,
    location: null,
    price: null,
    registrationUrl: null,
    groupSize: "4–6 people, including Edmund",
    duration: "About 2 hours",
    language: "English",
  },
];

export function activityStatus(activity: Activity, now = Date.now()) {
  if (
    !activity.startsAt ||
    !activity.endsAt ||
    !Number.isFinite(Date.parse(activity.startsAt)) ||
    !Number.isFinite(Date.parse(activity.endsAt)) ||
    Date.parse(activity.endsAt) <= Date.parse(activity.startsAt)
  )
    return "planning";
  if (Date.parse(activity.endsAt) <= now) return "past";
  return "upcoming";
}

export function activityDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

/** Request-time schedule snapshot; callers share one clock for all classifications. */
export function getActivitySchedule(now = Date.now()) {
  return {
    now,
    upcoming: activities
      .filter((a) => activityStatus(a, now) === "upcoming")
      .sort((a, b) => Date.parse(a.startsAt!) - Date.parse(b.startsAt!)),
    planning: activities.filter((a) => activityStatus(a, now) === "planning"),
    past: activities.filter((a) => activityStatus(a, now) === "past"),
  };
}
