import { notFound } from "next/navigation";
// Keep unmatched Admin URLs inside its owner-gated layout and recovery boundary.
export default function MissingAdminPage() {
  notFound();
}
