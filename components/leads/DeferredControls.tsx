"use client";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import type { Lead, Activity } from "@/lib/leads/model";
const Pending = () => (
  <p role="status" className="py-4 text-sm text-zinc-500">
    Opening controls…
  </p>
);
const Editor = dynamic(() => import("./LeadEditorPanel"), { loading: Pending });
const Status = dynamic(
  () => import("./LeadForms").then((m) => m.ActivityStatus),
  { loading: Pending },
);
const NewActivity = dynamic(
  () => import("./LeadForms").then((m) => m.NewActivity),
  { loading: Pending },
);

// Mount once on first expansion; collapsing does not erase unsaved form values.
function Deferred({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <details
      className={className}
      onToggle={(e) => {
        if (e.currentTarget.open) setOpened(true);
      }}
    >
      <summary className="cursor-pointer py-2 text-sm font-medium">
        {title}
      </summary>
      {opened ? children : null}
    </details>
  );
}
export function DeferredLeadEditor({ lead }: { lead: Lead }) {
  return (
    <Deferred
      title="Edit profile"
      className="rounded-2xl border border-zinc-200 bg-white p-5"
    >
      <Editor lead={lead} />
    </Deferred>
  );
}
export function DeferredActivityStatus({ activity }: { activity: Activity }) {
  return (
    <Deferred title="Update or add context" className="mt-2">
      {activity.notes ? (
        <p className="mt-3 whitespace-pre-wrap text-sm">{activity.notes}</p>
      ) : null}
      <Status key={activity.revision} activity={activity} />
    </Deferred>
  );
}
export function DeferredNewActivity({ leadId }: { leadId: string }) {
  return (
    <Deferred title="+ Record an activity">
      <NewActivity leadId={leadId} />
    </Deferred>
  );
}
