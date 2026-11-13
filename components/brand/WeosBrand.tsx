import { WhatelzMark } from "./WhatelzMark";

/** Shares the Admin's reviewed vector; the surrounding link supplies its label. */
export function WeosBrand() {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap font-bold tracking-tight">
      <WhatelzMark className="w-6 shrink-0" />
      <span>
        we<span className="text-weos-yellow">OS</span>
      </span>
    </span>
  );
}
