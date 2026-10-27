"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminUrl } from "@/lib/admin-url";
import type { TeamPerson } from "@/lib/team/model";
import { TeamTree } from "./TeamTree";
import { TeamPersonEditor } from "./TeamPersonEditor";

export function AdminTeamCanvas({
  people,
  focusId,
  teamId,
}: {
  people: TeamPerson[];
  focusId: string;
  teamId: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const active = useRef<string | null>(null);
  const router = useRouter();
  const person = people.find((item) => item.id === editingId);
  function activate(id: string) {
    if (active.current === id) {
      router.push(adminUrl(`/admin/team/${id}`));
      return;
    }
    active.current = id;
    setEditingId(id);
  }
  return (
    <div className="space-y-5">
      <TeamTree
        people={people}
        focusId={focusId}
        canSeeAll
        onPersonActivate={activate}
        editingId={editingId}
      />
      {person && (
        <section
          aria-label={`Quick edit ${person.display_name}`}
          className="rounded-xl border border-yellow-300 bg-white p-4 sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{person.display_name}</h2>
              {person.context && (
                <p className="mt-1 text-xs text-zinc-500">{person.context}</p>
              )}
            </div>
            <div className="flex gap-4 text-sm">
              <Link
                href={adminUrl(`/admin/team/${person.id}`)}
                className="underline"
              >
                Open profile →
              </Link>
              <button
                type="button"
                onClick={() => {
                  active.current = null;
                  setEditingId(null);
                }}
                className="text-zinc-500"
              >
                Close
              </button>
            </div>
          </div>
          <TeamPersonEditor
            key={person.id}
            person={person}
            teamId={teamId}
            compact
          />
        </section>
      )}
    </div>
  );
}
