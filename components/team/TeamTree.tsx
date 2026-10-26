"use client";

import { useState } from "react";
import { relationshipTo, type TeamPerson } from "@/lib/team/model";
import { TeamNodes } from "./TeamNodes";

export function TeamTree({
  people,
  focusId,
  canSeeAll = false,
  initialView = "nodes",
  onPersonActivate,
  editingId,
}: {
  people: TeamPerson[];
  focusId: string;
  canSeeAll?: boolean;
  initialView?: "tree" | "nodes";
  onPersonActivate?: (id: string) => void;
  editingId?: string | null;
}) {
  const [selectedId, setSelectedId] = useState(focusId);
  const [view, setView] = useState<"tree" | "nodes">(initialView);
  const focus = people.find((person) => person.id === selectedId);
  const bySponsor = new Map<string | null, TeamPerson[]>();
  for (const person of people) {
    const children = bySponsor.get(person.sponsor_person_id) ?? [];
    children.push(person);
    bySponsor.set(person.sponsor_person_id, children);
  }
  const relationships = people.map((person) =>
    relationshipTo(people, selectedId, person.id),
  );
  function branch(person: TeamPerson) {
    const children = bySponsor.get(person.id) ?? [];
    const relation = relationshipTo(people, selectedId, person.id);
    const Card = onPersonActivate ? "button" : "div";
    return (
      <li key={person.id} className="py-2">
        <Card
          type={onPersonActivate ? "button" : undefined}
          onClick={
            onPersonActivate
              ? () => {
                  setSelectedId(person.id);
                  onPersonActivate(person.id);
                }
              : undefined
          }
          aria-expanded={onPersonActivate ? editingId === person.id : undefined}
          className={`block w-full text-left rounded-xl border px-4 py-3 ${person.id === selectedId ? "border-yellow-400 bg-yellow-50" : "border-zinc-200 bg-white"}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-medium text-zinc-900">
              {person.display_name}
            </span>
            <span className="text-xs capitalize text-zinc-500">
              {relation === "self" ? "You / selected person" : relation}
            </span>
          </div>
          {person.abo_number ? (
            <p className="mt-1 text-xs font-medium text-zinc-600">
              ABO {person.abo_number}
            </p>
          ) : null}
          {person.context && (
            <p className="mt-1 text-xs text-zinc-500">{person.context}</p>
          )}
          {person.current_level ? (
            <p className="mt-2 text-xs font-medium text-zinc-700">
              Level: {person.current_level}
            </p>
          ) : null}
          {person.next_goal ? (
            <p className="mt-1 text-xs text-zinc-600">
              Next: {person.next_goal}
            </p>
          ) : null}
        </Card>
        {children.length > 0 && (
          <ul className="ml-3 mt-1 space-y-1 border-l border-zinc-200 pl-3 sm:ml-5 sm:pl-5">
            {children.map(branch)}
          </ul>
        )}
      </li>
    );
  }
  return (
    <section aria-label="Sponsor tree" className="space-y-6">
      <div
        className="inline-flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1"
        role="group"
        aria-label="Team view"
      >
        {(["tree", "nodes"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setView(option)}
            className={`rounded-lg px-4 py-2 text-sm font-medium capitalize focus-visible:outline-2 focus-visible:outline-yellow-500 ${view === option ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-900"}`}
          >
            {option === "tree" ? "Tree view" : "Node view"}
          </button>
        ))}
      </div>
      {canSeeAll && (
        <label className="block text-sm text-zinc-600">
          View relationships from
          <select
            className="mt-2 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 sm:max-w-sm"
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {people.map((person) => (
              <option key={person.id} value={person.id}>
                {person.display_name}
                {person.context ? ` — ${person.context}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
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
      <p className="text-sm text-zinc-500">
        Relationships are relative to{" "}
        {focus?.display_name ?? "your linked profile"}. A top-level person has
        no recorded upline in this view.
      </p>
      {view === "tree" ? (
        <ul className="space-y-2">{(bySponsor.get(null) ?? []).map(branch)}</ul>
      ) : (
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
          fitOnMount={Boolean(onPersonActivate)}
        />
      )}
      {!canSeeAll && (
        <p className="text-xs text-zinc-500">
          This view contains your direct upline and your downline branch. Counts
          cover only the people visible to you.
        </p>
      )}
    </section>
  );
}
