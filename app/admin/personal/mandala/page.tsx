import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "@/components/admin/AdminLink";
import { MandalaReader } from "@/components/admin/MandalaReader";
import "./mandala.css";
import { adminUrl } from "@/lib/admin-url";
import { loadMandala } from "@/lib/mandala-server";

export const metadata: Metadata = { title: "My Mandala — Personal — Admin" };

export default function MandalaPage() {
  return (
    <div className="mandala-page">
      <header className="mandala-page-header">
        <Link href={adminUrl("/admin/personal")} className="text-sm underline">
          ← Personal
        </Link>
        <h1>My Mandala</h1>
        <p className="text-sm text-zinc-500">
          My direction, and the life I am building.
        </p>
      </header>
      <Suspense
        fallback={
          <p role="status" className="text-sm text-zinc-500">
            Reading your saved plan…
          </p>
        }
      >
        <SavedMandala />
      </Suspense>
    </div>
  );
}

async function SavedMandala() {
  const result = await loadMandala();
  if (result.state === "unavailable")
    return (
      <p role="alert">
        Your plan could not be read from EMDEE. Check your existing EMDEE
        connection and try again. No saved plan has been changed.
      </p>
    );
  if (result.state === "missing")
    return <p>No Mandala document is available at the saved destination.</p>;
  if (result.state === "empty")
    return <p>The document has no Notes section to display.</p>;
  const { doc, body } = result;
  return (
    <MandalaReader
      body={body}
      original={doc.content!}
      hash={doc.doc_content_hash}
    />
  );
}
