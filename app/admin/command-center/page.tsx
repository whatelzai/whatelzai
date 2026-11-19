import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-url";

export default function LegacyCommandCenterPage() {
  redirect(adminUrl("/admin"));
}
