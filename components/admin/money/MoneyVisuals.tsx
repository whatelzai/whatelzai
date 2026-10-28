import {
  Sprout,
  ShieldCheck,
  GraduationCap,
  House,
  Smile,
  Heart,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  RotateCcw,
} from "lucide-react";
export const jarVisuals = {
  FFA: { Icon: Sprout, name: "Freedom", tone: "mint" },
  LTSS: { Icon: ShieldCheck, name: "Reserve", tone: "blue" },
  EDU: { Icon: GraduationCap, name: "Learning", tone: "yellow" },
  NECC: { Icon: House, name: "Essentials", tone: "peach" },
  PLAY: { Icon: Smile, name: "Play", tone: "lilac" },
  GIVE: { Icon: Heart, name: "Giving", tone: "rose" },
};
export function MoneyIcon({ jar, kind }: { jar?: string; kind?: string }) {
  const info = jarVisuals[jar as keyof typeof jarVisuals];
  const Icon =
    kind === "income"
      ? ArrowDownLeft
      : kind === "transfer"
        ? ArrowLeftRight
        : kind === "refund"
          ? RotateCcw
          : (info?.Icon ?? (kind === "expense" ? ArrowUpRight : Wallet));
  return (
    <span
      className={`money-symbol tone-${kind === "income" ? "mint" : (info?.tone ?? "neutral")}`}
    >
      <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
    </span>
  );
}
