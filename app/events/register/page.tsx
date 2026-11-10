import { cookies } from "next/headers";
import Link from "next/link";
import { mapEvent, isMapRegistrationOpen } from "@/lib/public-events/map";
import { platformRegistrationEnabled } from "@/lib/platform-event-registration";
import { EventPrice } from "@/components/events/EventPrice";
import RegistrationForm from "./RegistrationForm";
import "../../offers.css";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Register — Money Mindset × AI Skillset",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const { payment } = await searchParams;
  const hasSignup = Boolean(
    (await cookies()).get("whatelz_event_signup")?.value,
  );
  return (
    <main className="field-wrap event-registration-page">
      <Link href={mapEvent.path}>← Event details</Link>
      <h1>Join us on Thursday.</h1>
      <p>
        {mapEvent.title}
        <br />
        {mapEvent.dateLabel}
        <br />
        {mapEvent.timeLabel}
        <br />
        {mapEvent.venue} · {mapEvent.address}
      </p>
      <EventPrice />
      {!isMapRegistrationOpen() ? (
        <p>Registration is closed.</p>
      ) : !platformRegistrationEnabled() ? (
        <p>
          On-site registration is being prepared.{" "}
          <a href={mapEvent.checkoutUrl}>Register →</a>
        </p>
      ) : (
        <RegistrationForm checkExisting={hasSignup || Boolean(payment)} />
      )}
    </main>
  );
}
