"use client";

import { useEffect, useMemo, useRef } from "react";
import { relationshipTo, type TeamPerson } from "@/lib/team/model";
import { fitNodeCamera } from "@/lib/team/node-zoom";
import { useNodeGestures } from "./useNodeGestures";
import {
  layoutTeamNodes,
  NODE_HEIGHT,
  NODE_WIDTH,
  PAIR_OVERLAP,
} from "@/lib/team/node-layout";

export function TeamNodes({
  people,
  selectedId,
  onSelect,
  editingId,
  quickEdit = false,
  fitOnMount = false,
}: {
  people: TeamPerson[];
  selectedId: string;
  onSelect?: (id: string) => void;
  editingId?: string | null;
  quickEdit?: boolean;
  fitOnMount?: boolean;
}) {
  const layout = useMemo(() => layoutTeamNodes(people), [people]);
  const viewport = useRef<HTMLDivElement>(null);
  const {
    camera,
    zoomAt: zoomCamera,
    updateCamera,
    suppressClickUntil,
  } = useNodeGestures(viewport);
  const fitted = useRef(false);
  useEffect(() => {
    const element = viewport.current;
    if (fitted.current || !element) return;
    fitted.current = true;
    const selected = layout.nodes.find((node) => node.person.id === selectedId);
    updateCamera(
      fitOnMount || !selected
        ? fitNodeCamera(
            layout.width,
            layout.height,
            element.clientWidth,
            element.clientHeight,
          )
        : {
            zoom: 1,
            x: element.clientWidth / 2 - selected.x - selected.width / 2,
            y: element.clientHeight / 2 - selected.y - NODE_HEIGHT / 2,
          },
    );
  }, [fitOnMount, layout, selectedId, updateCamera]);
  const { zoom } = camera;
  const zoomAt = (value: number) =>
    zoomCamera(value, {
      x: (viewport.current?.clientWidth ?? 0) / 2,
      y: (viewport.current?.clientHeight ?? 0) / 2,
    });
  const focus = people.find((person) => person.id === selectedId);
  const controlClass =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="team-node-help" className="text-xs text-zinc-500">
          Sponsors sit above their downlines. Drag or scroll to explore. Pinch
          with two fingers to zoom.
          {quickEdit
            ? " Tap once to edit. Tap again or double-click to open the profile."
            : onSelect
              ? " Select a person to change perspective."
              : ""}
        </p>
        <div className="flex items-center gap-2" aria-label="Node view zoom">
          <button
            type="button"
            className={controlClass}
            aria-label="Zoom out"
            disabled={zoom <= 0.25}
            onClick={() => zoomAt(zoom - 0.25)}
          >
            −
          </button>
          <output
            className="min-w-12 text-center text-xs text-zinc-600"
            aria-live="polite"
          >
            {Math.round(zoom * 100)}%
          </output>
          <button
            type="button"
            className={controlClass}
            aria-label="Zoom in"
            disabled={zoom >= 1.5}
            onClick={() => zoomAt(zoom + 0.25)}
          >
            +
          </button>
          <button
            type="button"
            className={controlClass}
            onClick={() => {
              const element = viewport.current;
              if (element)
                updateCamera(
                  fitNodeCamera(
                    layout.width,
                    layout.height,
                    element.clientWidth,
                    element.clientHeight,
                  ),
                );
            }}
          >
            Fit
          </button>
          <button
            type="button"
            className={controlClass}
            onClick={() => {
              const element = viewport.current;
              const selected = layout.nodes.find(
                (node) => node.person.id === selectedId,
              );
              updateCamera({
                zoom: 1,
                x:
                  (element?.clientWidth ?? layout.width) / 2 -
                  (selected
                    ? selected.x + selected.width / 2
                    : layout.width / 2),
                y:
                  (element?.clientHeight ?? layout.height) / 2 -
                  (selected ? selected.y + NODE_HEIGHT / 2 : layout.height / 2),
              });
            }}
          >
            Reset
          </button>
        </div>
      </div>
      <div
        ref={viewport}
        role="region"
        aria-label="Team relationship nodes"
        aria-describedby="team-node-help"
        tabIndex={0}
        style={{ touchAction: "none" }}
        onClickCapture={(event) => {
          if (event.detail !== 0 && Date.now() < suppressClickUntil.current) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        className="h-[420px] sm:h-[560px] relative overflow-hidden cursor-grab active:cursor-grabbing select-none rounded-xl border border-zinc-200 bg-zinc-50 focus-visible:outline-2 focus-visible:outline-yellow-500"
      >
        <div className="absolute inset-0">
          <div
            className="absolute origin-top-left"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `translate(${camera.x}px, ${camera.y}px) scale(${zoom})`,
            }}
          >
            <svg
              width={layout.width}
              height={layout.height}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
            >
              {layout.edges.map(({ parent, child }) => (
                <line
                  key={child.person.id}
                  x1={parent.x + parent.width / 2}
                  y1={parent.y + NODE_HEIGHT / 2}
                  x2={child.x + child.width / 2}
                  y2={child.y + NODE_HEIGHT / 2}
                  stroke="#a1a1aa"
                  strokeWidth={1.5}
                />
              ))}
            </svg>
            <ul
              aria-label="People in this team view"
              className="m-0 list-none p-0"
            >
              {layout.nodes.map(({ person, names, width, x, y }) => {
                const selected = person.id === selectedId;
                const relation = relationshipTo(people, selectedId, person.id);
                const content = names.map((name, index) => (
                  <span
                    key={index}
                    className={`flex shrink-0 items-center justify-center rounded-full border-2 px-3 text-center text-[13px] font-semibold leading-tight text-zinc-900 ${selected ? "border-yellow-400 bg-yellow-50" : "border-zinc-300 bg-white"}`}
                    style={{
                      width: NODE_WIDTH,
                      height: NODE_HEIGHT,
                      marginLeft: index ? -PAIR_OVERLAP : 0,
                    }}
                  >
                    <span className="line-clamp-3 break-words">{name}</span>
                  </span>
                ));
                const cardClass =
                  "flex h-full w-full items-center rounded-full text-left";
                return (
                  <li
                    key={person.id}
                    className="absolute"
                    style={{
                      left: x,
                      top: y,
                      width,
                      height: NODE_HEIGHT,
                    }}
                  >
                    {onSelect ? (
                      <button
                        type="button"
                        title={[person.display_name, person.context]
                          .filter(Boolean)
                          .join(" — ")}
                        aria-label={person.display_name}
                        aria-describedby={`team-node-${person.id}-description`}
                        aria-pressed={selected}
                        aria-expanded={
                          quickEdit ? editingId === person.id : undefined
                        }
                        onClick={() => onSelect(person.id)}
                        className={`${cardClass} hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-500`}
                      >
                        {content}
                        <span
                          id={`team-node-${person.id}-description`}
                          className="sr-only"
                        >
                          {[
                            selected ? "Selected person" : relation,
                            person.current_level,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </button>
                    ) : (
                      <div className={cardClass}>{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      {!quickEdit && focus ? (
        <div className="space-y-1 text-sm text-zinc-600" aria-live="polite">
          <p className="font-medium text-zinc-900">{focus.display_name}</p>
          {focus.context ? <p>{focus.context}</p> : null}
          {focus.abo_number ? <p>ABO {focus.abo_number}</p> : null}
          {focus.current_level ? (
            <p>Current level: {focus.current_level}</p>
          ) : null}
          {focus.next_goal ? <p>Next goal: {focus.next_goal}</p> : null}
          {focus.progress_notes ? (
            <p className="whitespace-pre-wrap">{focus.progress_notes}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
