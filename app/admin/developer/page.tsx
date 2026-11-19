import { redirect } from "next/navigation";
import { adminUrl } from "@/lib/admin-url";

/** Preserve old bookmarks without rendering obsolete tooling or credentials. */
export default function DeveloperPage() {
  redirect(adminUrl("/admin/settings"));
}
