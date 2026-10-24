import { Suspense } from "react";
import { DayJobWork } from "@/components/admin/DayJobWork";
import { AdminText } from "@/components/admin/AdminPreferences";
import type { Metadata } from "next";
import { AdminArea } from "@/components/admin/AdminArea";

export const metadata: Metadata = { title: "Day Job — Admin" };

export default function DayJobPage() {
  return (
    <AdminArea
      title="Day Job"
      description="AsiaVerify. One work block at a time."
      intro={
        <Suspense
          fallback={
            <p className="text-sm text-zinc-500">Reading your focus…</p>
          }
        >
          <DayJobWork />
        </Suspense>
      }
      links={[]}
    >
      <details className="dayjob-boundaries">
        <summary>
          <AdminText text="Work boundaries" />
        </summary>
        <p>
          <AdminText text="AsiaVerify · weekdays 9am–6pm. Keep work within 40 hours a week; extra hours only for emergencies or incidents." />
        </p>
        <p>
          <AdminText text="A dependable job supports the runway. Protect evenings for building the life beyond it." />
        </p>
      </details>
    </AdminArea>
  );
}
