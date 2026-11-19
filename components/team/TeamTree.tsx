"use client";

import { useState } from "react";
import { relationshipTo, type TeamPerson } from "@/lib/team/model";
import { TeamNodes } from "./TeamNodes";

export function TeamTree({
  people,
  focusId,
  canSeeAll = false,
  onPersonActivate,
  editingId,
}: {
  people: TeamPerson[];
  focusId: string;
  canSeeAll?: boolean;
  onPersonActivate?: (id: string) => void;
  editingId?: string | null;
}) {
  const [selectedId, setSelectedId] = useState(focusId);
  const relationships = people.map((person) =>
    relationshipTo(people, selectedId, person.id),
  );
  return (
    <section aria-label="Team network" className="space-y-6">
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          [
            "Uplines",
            relationships.filter((relation) => relation.includes("upline"))
              .length,
          ],
          [
            "Downlines",
            relationships.filter((relation) => relation.includes("downline"))
              .length,
          ],
          [
            "Direct sidelines",
            relationships.filter((relation) => relation === "direct sideline")
              .length,
          ],
        ].map(([label, count]) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-200 px-2 py-4"
          >
            <p className="text-2xl font-semibold text-zinc-900">{count}</p>
            <p className="mt-1 text-xs text-zinc-500">{label}</p>
          </div>
        ))}
      </div>
      <TeamNodes
        people={people}
        selectedId={selectedId}
        onSelect={
          canSeeAll
            ? (id) => {
                setSelectedId(id);
                onPersonActivate?.(id);
              }
            : undefined
        }
        editingId={onPersonActivate ? editingId : undefined}
        quickEdit={Boolean(onPersonActivate)}
      />
    </section>
  );
}
