const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const text = (value: unknown, max = 1500) =>
  typeof value === "string" ? value.slice(0, max) : undefined;
/** Explicit allowlist: never pass arbitrary profile metadata to the model. */
export function hqhFacts(value: unknown) {
  const m = object(value);
  const intakes = Array.isArray(m.hqh_intakes) ? m.hqh_intakes : [];
  const intake = object(intakes.at(-1));
  const captures = Array.isArray(m.hqh_context_captures)
    ? m.hqh_context_captures
    : [];
  const invitation = captures
    .map(object)
    .find(
      (x) =>
        typeof x.capture_id === "string" &&
        x.capture_id.startsWith("intro-gather-invitation-context-"),
    );
  const familiarity = captures
    .map(object)
    .filter(
      (x) =>
        typeof x.capture_id === "string" &&
        x.capture_id.startsWith("awareness-and-familiarity-"),
    )
    .at(-1);
  const social = object(m.social_comfort),
    awareness = object(m.amway_connection_awareness),
    readiness = object(m.intro_gather_readiness),
    logistics = object(m.intro_gather_logistics);
  return {
    poti_status: ["not_yet", "completed"].includes(String(m.poti_status))
      ? m.poti_status
      : "unknown",
    poti_reported_on: text(m.poti_status_reported_on, 30),
    intake: {
      reported_on: text(intake.reported_on, 30),
      age_as_reported:
        typeof intake.age_as_reported === "number"
          ? intake.age_as_reported
          : undefined,
      occupation: text(intake.occupation_as_reported, 200),
      raw_input: text(intake.raw_input),
      objective: text(intake.organizer_objective, 700),
    },
    invitation_context: text(invitation?.text, 2000),
    familiarity_context: text(familiarity?.text, 1700),
    social_comfort: {
      level: text(social.level, 40),
      certainty: text(social.certainty, 200),
      description: text(social.description, 700),
    },
    amway_awareness: {
      status: text(awareness.status, 40),
      reported_on: text(awareness.reported_on, 30),
    },
    readiness: {
      stage: text(readiness.stage, 80),
      concerns: text(readiness.concerns_status, 100),
    },
    logistics: {
      dates: Array.isArray(logistics.attendance_dates_planned)
        ? logistics.attendance_dates_planned
            .filter((x) => typeof x === "string")
            .slice(0, 5)
        : [],
      overnight:
        typeof logistics.overnight_planned === "boolean"
          ? logistics.overnight_planned
          : undefined,
      departure_on: text(logistics.departure_on, 30),
      departure_time: text(logistics.departure_time_approx, 30),
      badminton:
        typeof logistics.badminton_planned === "boolean"
          ? logistics.badminton_planned
          : undefined,
      badminton_on: text(logistics.badminton_on, 30),
    },
  };
}
