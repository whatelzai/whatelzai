import {
  WorkspaceFocus,
  WorkspaceFocusLoading,
} from "@/components/admin/WorkspaceFocus";
import { Suspense } from "react";
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
        <Suspense fallback={<WorkspaceFocusLoading />}>
          <WorkspaceFocus lane="day-job" />
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
