import Link from "next/link";
import { headers } from "next/headers";
import { siteSurface } from "@/lib/domain-routing";
import { AdminMissingResource } from "@/components/admin/AdminMissingResource";
import { FieldHero } from "@/components/editorial/FieldElements";
export default async function NotFound() {
  const requestHeaders = await headers();
  if (
    siteSurface(requestHeaders.get("host") ?? "") === "admin" ||
    requestHeaders.get("x-whatelz-surface") === "admin"
  ) {
    return (
      <main className="min-h-dvh bg-white px-6">
        <AdminMissingResource />
      </main>
    );
  }
  return (
    <main>
      <FieldHero
        label="A small detour"
        title="This page hasn’t been written."
        description="The link might have moved, or the story might be somewhere else. There’s still plenty to explore."
        number="404"
      />
      <div className="field-wrap field-section">
        <Link href="/playbook" className="field-button">
          Start with the playbook ↗
        </Link>
        <Link href="/" className="text-link" style={{ marginLeft: 24 }}>
          Back to the beginning →
        </Link>
      </div>
    </main>
  );
}
