"use client";

import { useMemo, useState } from "react";
import "./carousel.css";

const arrowClass = "grid size-11 place-items-center rounded-full border border-zinc-300 text-xl disabled:opacity-30";
const quarters = ["2026 Q4", "2027 Q1", "2027 Q2", "2027 Q3", "2027 Q4", "2028 Q1", "2028 Q2", "2028 Q3", "2028 Q4"];
// The root has its own identity because Nicole's Q2 recruit also uses E.
const original = [
  [["edmund", "N"], ["edmund", "ZH"]],
  [["edmund", "A"], ["N", "B"], ["ZH", "C"]],
  [["edmund", "D"], ["N", "E"], ["B", "F"], ["ZH", "G"], ["C", "H"], ["A", "I"]],
];
// Allocate each quarter from its opening roster; new recruits start next quarter.
function buildScenario(rate: number) {
  const additions = rate === 1 ? [...original] : [original[0]];
  const roster = ["edmund", ...additions.flat().map(([, child]) => child)];
  let nextNumber = 1;
  while (additions.length < quarters.length) {
    const recruits = roster.flatMap(parent => Array.from({ length: rate }, () => [parent, "P" + nextNumber++]));
    additions.push(recruits);
    roster.push(...recruits.map(([, child]) => child));
  }
  return additions;
}
const names: Record<string, string> = { edmund: "Edmund", N: "Nicole", ZH: "Zhi Hao" };

export default function QuarterCarousel() {
  const [index, setIndex] = useState(0);
  const [rate, setRate] = useState(1);
  const [focus, setFocus] = useState("edmund");
  const additions = useMemo(() => buildScenario(rate), [rate]);
  const edges = additions.slice(0, index + 1).flat();
  const recruits = new Set(additions[index].map(([, child]) => child));
  const branches = new Map<string, string[]>();
  const sponsors = new Map<string, string>();
  const sizes = new Map<string, number>();
  for (const [parent, child] of edges) {
    if (!branches.has(parent)) branches.set(parent, []);
    branches.get(parent)!.push(child);
    sponsors.set(child, parent);
  }
  for (let i = edges.length - 1; i >= 0; i--) {
    const [parent, child] = edges[i];
    sizes.set(parent, (sizes.get(parent) ?? 1) + (sizes.get(child) ?? 1));
  }
  const children = (parent: string) => branches.get(parent) ?? [];
  const drillDown = edges.length >= 768;
  const nodes: { id: string; x: number; y: number; size: number }[] = [];
  let leaves = 0;
  function place(id: string, depth: number): { id: string; x: number; y: number; size: number } {
    const branch = (drillDown && depth === 1 ? [] : children(id)).map(child => place(child, depth + 1));
    const x: number = branch.length ? (branch[0].x + branch[branch.length - 1].x) / 2 : 28 + leaves++ * 55;
    const size: number = 1 + branch.reduce((total, child) => total + child.size, 0);
    const node = { id, x, y: 26 + depth * 58, size };
    nodes.push(node);
    return node;
  }
  const root = place(drillDown ? focus : "edmund", 0);
  const byId = new Map(nodes.map(node => [node.id, node]));
  const width = leaves * 55;
  const height = Math.max(...nodes.map(node => node.y)) + 25;
  const direct = children("edmund");
  const compact = edges.length >= 12;
  const total = edges.length + 1;
  const diagram = <svg key={index} className="motion-safe:animate-[quarter-enter_180ms_ease-out]" role="img"
      aria-label={quarters[index] + " projected sponsor tree, " + root.size + " people"}
      viewBox={`0 0 ${width} ${height}`} style={{width: compact ? width : "100%", maxWidth: compact ? "none" : width, margin: "1rem auto", display: "block"}}>
      {nodes.filter(node => node.id !== root.id).map(({id: child}) => {
        const parent = sponsors.get(child)!;
        const p = byId.get(parent)!;
        const c = byId.get(child)!;
        return <line key={child} x1={p.x} y1={p.y} x2={c.x} y2={c.y} stroke="#999" strokeWidth="1.5"/>;
      })}
      {nodes.map(({id,x,y}) => <g key={id}>
        <circle cx={x} cy={y} r="19" fill={id === "edmund" ? "#ffdf16" : recruits.has(id) ? "#fff2aa" : "white"} stroke="#333"/>
        <text x={x} y={y} dy=".35em" textAnchor="middle" fontSize="14" fill="#171717">{id === "edmund" ? "E" : id}</text>
      </g>)}
    </svg>;
  return <><div role="group" aria-label="Recruits per person per quarter" className="inline-flex rounded-full border p-1">
    {[1, 2].map(value => <button key={value} type="button" aria-pressed={rate === value} className="min-h-11 rounded-full px-4 aria-pressed:bg-yellow-300 aria-pressed:text-black" onClick={() => { setRate(value); setFocus("edmund"); }}>{value} {value === 1 ? "recruit" : "recruits"} each</button>)}
  </div><section className="rounded-2xl border border-zinc-300 p-4">
    <header className="flex items-center justify-between gap-3">
      <button type="button" className={arrowClass} aria-label="Previous quarter" disabled={index === 0} onClick={() => { setIndex(index - 1); setFocus("edmund"); }}>←</button>
      <h2 aria-live="polite" className="text-lg font-semibold">{quarters[index]}</h2>
      <button type="button" className={arrowClass} aria-label="Next quarter" disabled={index === quarters.length - 1} onClick={() => { setIndex(index + 1); setFocus("edmund"); }}>→</button>
    </header>
    {compact ? <div key={index} className="my-4">
      <div className="mx-auto w-fit rounded-full bg-yellow-300 px-4 py-2 text-black">Edmund · {total.toLocaleString("en-US")}</div>
      <ul aria-label="Edmund’s direct branches" className="mx-auto mt-3 grid max-w-md grid-cols-3 gap-2">
        {direct.map(id => <li key={id} className="rounded-xl border border-zinc-300 p-2 text-center text-sm">
          {names[id] ?? id}<strong className="block text-lg">{(sizes.get(id) ?? 1).toLocaleString("en-US")}</strong>
        </li>)}
      </ul>
      <details key={rate} className="mt-4">
        <summary className="cursor-pointer py-2">Explore {total.toLocaleString("en-US")} nodes</summary>
        {drillDown && <div className="mb-3 space-y-2">
          <p>{names[focus] ?? focus} · {(sizes.get(focus) ?? 1).toLocaleString("en-US")} in branch</p>
          {focus !== "edmund" && <button type="button" className="p-2 underline" onClick={() => setFocus(sponsors.get(focus)!)}>↑ Sponsor</button>}
          <div className="flex flex-wrap gap-2">{children(focus).filter(id => branches.has(id)).map(id => <button key={id} type="button" className="rounded-lg border p-2" onClick={() => setFocus(id)}>Explore {names[id] ?? id}</button>)}</div>
        </div>}
        <div tabIndex={0} aria-label="Scrollable team diagram" className="overflow-x-auto">{diagram}</div>
      </details>
    </div> : <div className="grid min-h-60 place-items-center">{diagram}</div>}
    {!compact && <>
    <p className="mb-2 font-semibold">Edmund · {total.toLocaleString("en-US")} total</p>
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Direct branch totals">
      {children("edmund").map(id => <span key={id}>{names[id] ?? id} · <strong>{(sizes.get(id) ?? 1).toLocaleString("en-US")}</strong></span>)}
    </div>
    </>}
  </section></>;
}

