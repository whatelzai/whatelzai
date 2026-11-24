"use client";

import { useState } from "react";
import "./carousel.css";

const arrowClass = "grid size-11 place-items-center rounded-full border border-zinc-300 text-xl disabled:opacity-30";
const quarters = ["2026 Q4", "2027 Q1", "2027 Q2"];
// The root has its own identity because Nicole's Q2 recruit also uses E.
const additions = [
  [["edmund", "N"], ["edmund", "ZH"]],
  [["edmund", "A"], ["N", "B"], ["ZH", "C"]],
  [["edmund", "D"], ["N", "E"], ["B", "F"], ["ZH", "G"], ["C", "H"], ["A", "I"]],
];
const names: Record<string, string> = { edmund: "Edmund", N: "Nicole", ZH: "Zhi Hao" };

export default function QuarterCarousel() {
  const [index, setIndex] = useState(0);
  const edges = additions.slice(0, index + 1).flat();
  const children = (parent: string) => edges.filter(([p]) => p === parent).map(([, child]) => child);
  const nodes: { id: string; x: number; y: number; size: number }[] = [];
  let leaves = 0;
  function place(id: string, depth: number): { id: string; x: number; y: number; size: number } {
    const branch = children(id).map(child => place(child, depth + 1));
    const x: number = branch.length ? (branch[0].x + branch[branch.length - 1].x) / 2 : 28 + leaves++ * 55;
    const size: number = 1 + branch.reduce((total, child) => total + child.size, 0);
    const node = { id, x, y: 26 + depth * 58, size };
    nodes.push(node);
    return node;
  }
  const root = place("edmund", 0);
  const byId = new Map(nodes.map(node => [node.id, node]));
  const width = leaves * 55;
  const height = Math.max(...nodes.map(node => node.y)) + 25;
  return <section className="rounded-2xl border border-zinc-300 p-4">
    <header className="flex items-center justify-between gap-3">
      <button type="button" className={arrowClass} aria-label="Previous quarter" disabled={index === 0} onClick={() => setIndex(index - 1)}>←</button>
      <h2 aria-live="polite" className="text-lg font-semibold">{quarters[index]}</h2>
      <button type="button" className={arrowClass} aria-label="Next quarter" disabled={index === quarters.length - 1} onClick={() => setIndex(index + 1)}>→</button>
    </header>
    <div className="grid min-h-60 place-items-center"><svg key={index} className="motion-safe:animate-[quarter-enter_180ms_ease-out]" role="img" aria-label={edges.map(([p,c]) => (names[p] ?? p) + " sponsors " + (names[c] ?? c)).join(". ")}
      viewBox={`0 0 ${width} ${height}`} style={{width: "100%", maxWidth: width, margin: "1rem auto", display: "block"}}>
      {edges.map(([parent, child]) => {
        const p = byId.get(parent)!;
        const c = byId.get(child)!;
        return <line key={child} x1={p.x} y1={p.y} x2={c.x} y2={c.y} stroke="#999" strokeWidth="1.5"/>;
      })}
      {nodes.map(({id,x,y}) => <g key={id}>
        <circle cx={x} cy={y} r="19" fill={id === "edmund" ? "#ffdf16" : additions[index].some(([,child]) => child === id) ? "#fff2aa" : "white"} stroke="#333"/>
        <text x={x} y={y} dy=".35em" textAnchor="middle" fontSize="14" fill="#171717">{id === "edmund" ? "E" : id}</text>
      </g>)}
    </svg></div>
    <p className="mb-2 font-semibold">Edmund · {root.size} total</p>
    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Direct branch totals">
      {children("edmund").map(id => <span key={id}>{names[id] ?? id} · <strong>{byId.get(id)!.size}</strong></span>)}
    </div>
  </section>;
}

