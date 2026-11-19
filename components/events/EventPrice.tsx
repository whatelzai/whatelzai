import { mapEvent, type PublicSeminar } from "@/lib/public-events/map";

// Discount framing remains exclusive to the original 12 November offer.
export function EventPrice({ event = mapEvent }: { event?: PublicSeminar }) {
  return (
    <p
      className="map-price"
      aria-label={`${event.id === mapEvent.id ? `Originally ${event.originalPrice}, now ` : ""}${event.price} per person`}
    >
      {event.id === mapEvent.id && (
        <del aria-hidden="true">{event.originalPrice}</del>
      )}{" "}
      <strong aria-hidden="true">{event.price}</strong>
      <span aria-hidden="true">
        per person · final price ·{" "}
        {event.id === mapEvent.id ? "12 November only" : "19 November"}
      </span>
    </p>
  );
}
