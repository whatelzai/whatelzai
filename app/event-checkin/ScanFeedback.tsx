import { Check, CircleAlert, Clock3 } from "lucide-react";
export type CheckinReceipt = {
  status: "checked_in" | "already_checked_in";
  name: string;
  at: string;
};
export default function ScanFeedback({
  receipt,
  message,
  tone = "info",
}: {
  receipt: CheckinReceipt | null;
  message: string;
  tone?: "info" | "error";
}) {
  const duplicate = receipt?.status === "already_checked_in";
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`ticket-scan-feedback ${receipt ? (duplicate ? "is-duplicate" : "is-success") : tone === "error" ? "is-error" : ""}`}
    >
      {receipt ? (
        <>
          <span className="ticket-result-icon" aria-hidden="true">
            {duplicate ? (
              <Clock3 size={28} />
            ) : (
              <Check size={30} strokeWidth={3} />
            )}
          </span>
          <div className="ticket-result-copy">
            <span className="ticket-result-label">
              {duplicate ? "Already checked in" : "Checked in"}
            </span>
            <strong className="ticket-result-name">{receipt.name}</strong>
            <span className="ticket-result-time">
              {new Date(receipt.at).toLocaleTimeString("en-SG", {
                timeZone: "Asia/Singapore",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {duplicate ? "Original check-in kept" : "Attendance saved"}
            </span>
          </div>
        </>
      ) : message ? (
        <>
          {tone === "error" && <CircleAlert size={22} aria-hidden="true" />}
          <span>{message}</span>
        </>
      ) : null}
    </div>
  );
}
