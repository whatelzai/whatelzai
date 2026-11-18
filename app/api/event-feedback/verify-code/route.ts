import { feedbackJson as json } from "@/lib/event-feedback/http";
export async function POST() {
  return json(
    {
      error:
        "Verification codes are no longer needed. Refresh the feedback form to check your registration email.",
    },
    410,
  );
}
