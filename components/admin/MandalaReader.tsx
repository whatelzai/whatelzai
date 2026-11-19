"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { BriefMarkdown } from "./BriefMarkdown";
import { mandalaAreas, mandalaGoal, MANDALA_PATH } from "@/lib/mandala";
import { readingSections } from "@/lib/admin-reading";

const views = [
  { id: "areas", label: "Life areas" },
  { id: "plan", label: "Money & time" },
  { id: "grid", label: "9×9 grid" },
  { id: "source", label: "Full record" },
] as const;
type View = (typeof views)[number]["id"];

export function MandalaReader({
  body,
  original,
  hash,
}: {
  body: string;
  original: string;
  hash: string;
}) {
  const [view, setView] = useState<View>("areas");
  const [selected, setSelected] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const { areas, goal, sections } = useMemo(
    () => ({
      areas: mandalaAreas(body),
      goal: mandalaGoal(body),
      sections: readingSections(body),
    }),
    [body],
  );
  const area = areas?.[selected];
  const selectArea = (index: number) => {
    setSelected(index);
    setView("areas");
  };
  const tabKeys = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? views.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + views.length) %
            views.length;
    setView(views[next].id);
    document.getElementById(`mandala-tab-${views[next].id}`)?.focus();
  };
  return (
    <div className="mandala-reader">
      <section
        className="mandala-direction"
        aria-label="My financial freedom goal"
      >
        <div className="mandala-purpose">
          <p className="mandala-direction-title">
            {goal.centre?.title.replace(/^Centre — /, "") || "My direction"}
          </p>
          <p className="mandala-subtitle">
            Build a different and better adult life.
            {goal.figures && (
              <span className="mandala-expense-baseline">
                Expense baseline: SG${goal.figures.expenses} / month
              </span>
            )}
          </p>
        </div>
        {goal.figures ? (
          <dl className="mandala-goal-figures">
            <div className="mandala-income">
              <dt>Monthly passive income goal</dt>
              <dd>SG${goal.figures.income}</dd>
            </div>
            <div>
              <dt>Target age</dt>
              <dd>{goal.figures.age}</dd>
            </div>
            <div>
              <dt>Proof period</dt>
              <dd>{goal.figures.proof}</dd>
            </div>
          </dl>
        ) : (
          <p className="mandala-goal-fallback">
            {goal.sentence ||
              "Read the complete saved direction in Full record."}
          </p>
        )}
      </section>

      <div
        role="tablist"
        aria-label="Mandala views"
        className="mandala-view-tabs"
      >
        {views.map((item, index) => (
          <button
            key={item.id}
            id={`mandala-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            aria-controls={`mandala-panel-${item.id}`}
            tabIndex={view === item.id ? 0 : -1}
            onClick={() => setView(item.id)}
            onKeyDown={(event) => tabKeys(event, index)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        id="mandala-panel-areas"
        role="tabpanel"
        aria-labelledby="mandala-tab-areas"
        hidden={view !== "areas"}
        tabIndex={0}
      >
        {areas && area ? (
          <div className="mandala-area-layout">
            <nav aria-label="Life areas" className="mandala-area-nav">
              <p>My eight life areas</p>
              {areas.map((item, index) => (
                <button
                  type="button"
                  key={item.title}
                  aria-current={selected === index ? "true" : undefined}
                  onClick={() => selectArea(index)}
                >
                  <span className="mandala-area-rank">{index + 1}</span>
                  <span>{item.title.replace(/^\d+\. /, "")}</span>
                  {selected === index && (
                    <ArrowRight size={15} aria-hidden="true" />
                  )}
                </button>
              ))}
              <p className="mandala-nav-note">
                Health and energy are foundations, not leftover priorities.
              </p>
            </nav>
            <div className="mandala-area-mobile">
              <label htmlFor="mandala-area">Choose a life area</label>
              <select
                id="mandala-area"
                value={selected}
                onChange={(event) => selectArea(Number(event.target.value))}
              >
                {areas.map((item, index) => (
                  <option key={item.title} value={index}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>
            <section
              className="mandala-area-content"
              aria-labelledby="mandala-area-heading"
            >
              <header className="mandala-area-header">
                <div>
                  <h2 ref={heading} id="mandala-area-heading" tabIndex={-1}>
                    {area.title.replace(/^\d+\. /, "")}
                  </h2>
                  <p>
                    Eight intentions to work towards. No rush to do them all
                    today.
                  </p>
                </div>
                <span className="mandala-approval">
                  {area.body.startsWith(
                    "Approval provenance: Individually approved.",
                  )
                    ? "Reviewed together"
                    : "Editable first pass"}
                </span>
              </header>
              <ol className="mandala-action-list">
                {area.cells.map((cell) => (
                  <li key={cell.number}>
                    <span className="mandala-action-number" aria-hidden="true">
                      {cell.number}
                    </span>
                    <div>
                      <h3>{cell.title}</h3>
                      <BriefMarkdown body={cell.detail} />
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mandala-area-provenance">
                {area.body
                  .split(/\n\s*\n/)[0]
                  .replace(/^Approval provenance: /, "")}
              </p>
              <div className="mandala-area-pager">
                <button
                  type="button"
                  disabled={selected === 0}
                  onClick={() => {
                    selectArea(selected - 1);
                    heading.current?.focus();
                  }}
                >
                  <ArrowLeft size={16} aria-hidden="true" />
                  Previous area
                </button>
                <span>
                  {selected + 1} of {areas.length}
                </span>
                <button
                  type="button"
                  disabled={selected === areas.length - 1}
                  onClick={() => {
                    selectArea(selected + 1);
                    heading.current?.focus();
                  }}
                >
                  Next area
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            </section>
          </div>
        ) : (
          <section className="mandala-source">
            <h2>Saved life areas</h2>
            <p>
              The document structure has changed. Your complete saved plan is
              still available below.
            </p>
            <BriefMarkdown body={body} />
          </section>
        )}
      </div>

      <div
        id="mandala-panel-plan"
        role="tabpanel"
        aria-labelledby="mandala-tab-plan"
        hidden={view !== "plan"}
        tabIndex={0}
        className="mandala-plan-layout"
      >
        {view === "plan" &&
          sections
            .filter((section) =>
              ["Horizon", "Money — confirmed allocation"].includes(
                section.title,
              ),
            )
            .map((section) => (
              <section key={section.title} className="mandala-plan-section">
                <h2>
                  {section.title === "Horizon"
                    ? "The horizon"
                    : "My money plan"}
                </h2>
                <BriefMarkdown body={section.body} />
              </section>
            ))}
        {!sections.some((section) =>
          ["Horizon", "Money — confirmed allocation"].includes(section.title),
        ) && <p>Read the latest timeline and allocation in Full record.</p>}
      </div>

      <div
        id="mandala-panel-grid"
        role="tabpanel"
        aria-labelledby="mandala-tab-grid"
        hidden={view !== "grid"}
        tabIndex={0}
      >
        <section className="mandala-grid-section">
          <h2>The whole picture</h2>
          <p>
            Explore a life area from its centre. The supporting cells are the
            same intentions shown in Life areas.
          </p>
          {view === "grid" &&
            (areas ? (
              <div
                role="region"
                aria-label="Complete 9 by 9 Mandala; scroll horizontally"
                tabIndex={0}
                className="mandala-grid-scroll"
              >
                <div className="mandala-full-grid">
                  {[...areas.slice(0, 4), null, ...areas.slice(4)].map(
                    (item, block) => (
                      <div key={block} className="mandala-grid-block">
                        {Array.from({ length: 9 }, (_, cell) => {
                          const index = cell < 4 ? cell : cell - 1;
                          return cell === 4 ? (
                            item ? (
                              <button
                                key={cell}
                                type="button"
                                onClick={() => {
                                  selectArea(areas.indexOf(item));
                                  requestAnimationFrame(() =>
                                    heading.current?.focus(),
                                  );
                                }}
                              >
                                {item.title.replace(/^\d+\. /, "")}
                              </button>
                            ) : (
                              <div key={cell} className="mandala-grid-goal">
                                {goal.centre?.title.replace(/^Centre — /, "") ||
                                  "My direction"}
                              </div>
                            )
                          ) : (
                            <div key={cell}>
                              {item
                                ? item.cells[index].title
                                : areas[index].title.replace(/^\d+\. /, "")}
                            </div>
                          );
                        })}
                      </div>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <p>
                The grid needs eight complete areas. Your full record remains
                available.
              </p>
            ))}
        </section>
      </div>

      <div
        id="mandala-panel-source"
        role="tabpanel"
        aria-labelledby="mandala-tab-source"
        hidden={view !== "source"}
        tabIndex={0}
        className="mandala-source"
      >
        {view === "source" && (
          <>
            <h2 id="mandala-source-heading" tabIndex={-1}>
              The complete saved record
            </h2>
            <p className="mandala-source-note">
              Original wording, approval history and open decisions from EMDEE.
            </p>
            <BriefMarkdown body={original} />
            <p className="mandala-source-path">
              {MANDALA_PATH} · {hash}
            </p>
          </>
        )}
      </div>

      <footer className="mandala-reader-footer">
        <span>
          <BookOpen size={15} aria-hidden="true" />
          Read from EMDEE
        </span>
        <button
          type="button"
          onClick={() => {
            setView("source");
            requestAnimationFrame(() =>
              document.getElementById("mandala-source-heading")?.focus(),
            );
          }}
        >
          Read original context and open decisions
          <ArrowRight size={15} aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
}
