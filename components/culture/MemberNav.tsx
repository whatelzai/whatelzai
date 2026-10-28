"use client";
import { useMemberLanguage } from "@/components/fcos/MemberLanguage";
import Link from "@/components/fcos/MemberLink";
import {
  House,
  MessageCircle,
  UsersRound,
  Library,
  UserRound,
} from "lucide-react";
import { memberTab } from "@/lib/fcos/navigation";
const items = [
  { href: "/leads", label: "Baobeis", icon: UsersRound },
  { href: "/assistant", label: "Chat", icon: MessageCircle },
  { href: "/", label: "Home", icon: House },
  { href: "/resources", label: "Resources", icon: Library },
  { href: "/profile", label: "Profile", icon: UserRound },
];
export function MemberNav({
  current,
  compact = false,
  accent = "yellow",
  persistent = false,
}: {
  current: string;
  compact?: boolean;
  accent?: "yellow" | "orange";
  persistent?: boolean;
}) {
  const { t } = useMemberLanguage();
  const selected = memberTab(current);
  const orange = accent === "orange";
  return (
    <nav
      aria-label={t("fcOS workspace")}
      data-fcos-nav
      data-fcos-persistent-nav={persistent || undefined}
      className={
        compact
          ? "shrink-0 md:mb-2 md:border-b md:border-zinc-200 md:pb-3"
          : "mb-2 border-b border-zinc-200 pb-4"
      }
    >
      <div
        className={
          compact ? "hidden" : "flex items-baseline justify-between md:mb-4"
        }
      >
        <Link href="/" className="text-xl font-bold tracking-tight">
          fc
          <span className={orange ? "text-orange-500" : "text-yellow-500"}>
            OS
          </span>
        </Link>
        <span className="text-xs text-zinc-500">
          {t("Prepare · connect · grow")}
        </span>
      </div>
      <div
        className={`${persistent ? "fcos-persistent-tabs " : ""}fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-zinc-200 bg-white px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.04)] md:static md:gap-1 md:border-0 md:p-0 md:shadow-none`}
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={selected === item.href ? "page" : undefined}
            className={`flex min-h-[76px] min-w-0 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-yellow-600 md:min-h-14 md:flex-row md:gap-2 md:rounded-xl md:px-2 md:text-sm ${selected === item.href ? (orange ? "text-orange-600 md:bg-orange-50" : "text-zinc-950 md:bg-yellow-100") : "text-zinc-500 hover:text-zinc-950"}`}
          >
            <span
              className={
                item.href === "/"
                  ? `-mt-6 flex h-14 w-14 items-center justify-center rounded-full border-4 border-white ${orange ? "bg-orange-500 text-white" : "bg-yellow-300 text-zinc-950"} shadow-md md:mt-0 md:h-auto md:w-auto md:border-0 md:bg-transparent md:text-inherit md:shadow-none ${selected === "/" ? "ring-2 ring-yellow-500 md:ring-0" : ""}`
                  : `flex h-8 w-10 items-center justify-center rounded-xl md:h-auto md:w-auto ${selected === item.href ? (orange ? "bg-orange-50 text-orange-600 md:bg-transparent" : "bg-yellow-100 text-zinc-950 md:bg-transparent") : ""}`
              }
            >
              <item.icon
                size={item.href === "/" ? 25 : 22}
                aria-hidden="true"
              />
            </span>
            <span
              className={
                item.href === "/" ? "font-bold uppercase md:normal-case" : ""
              }
            >
              {t(item.label)}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
