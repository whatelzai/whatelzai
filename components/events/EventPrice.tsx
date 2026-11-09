import { mapEvent } from "@/lib/public-events/map";

// This offer belongs only to the confirmed 12 November occurrence.
export function EventPrice() {
  return (
    <p
      className="map-price"
      aria-label={`Originally ${mapEvent.originalPrice}, now ${mapEvent.price} per person`}
    >
      <del aria-hidden="true">{mapEvent.originalPrice}</del>{" "}
      <strong aria-hidden="true">{mapEvent.price}</strong>
      <span aria-hidden="true">
        per person · final price · 12 November only
      </span>
    </p>
  );
}
