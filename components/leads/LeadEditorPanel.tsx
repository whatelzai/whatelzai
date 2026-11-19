"use client";
import type { Lead } from "@/lib/leads/model";
import { LeadEditor, LeadPriority } from "./LeadForms";
import { PhotoEditor } from "./ProfileControls";
import { LeadPrivacy } from "./LeadPrivacy";
export default function LeadEditorPanel({ lead }: { lead: Lead }) {
  return (
    <div className="mt-5 space-y-6">
      <LeadPrivacy key={`privacy-${lead.revision}`} lead={lead} />
      <PhotoEditor key={`photo-${lead.revision}`} lead={lead} />
      <LeadPriority key={`priority-${lead.revision}`} lead={lead} />
      <LeadEditor key={`profile-${lead.revision}`} lead={lead} />
    </div>
  );
}
