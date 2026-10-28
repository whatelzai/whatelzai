"use client";
import { useActionState } from "react";
import { Languages } from "lucide-react";
import { useMemberLanguage } from "@/components/fcos/MemberLanguage";
import { saveMemberLanguage } from "./language-actions";
export function LanguageSwitch() {
  const { language, t } = useMemberLanguage();
  const [state, action, pending] = useActionState(saveMemberLanguage, {
    error: "",
  });
  return (
    <form
      action={action}
      aria-label={t("Interface language")}
      aria-busy={pending}
      className="py-1"
    >
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-zinc-600">
          <Languages size={17} aria-hidden="true" />
          {t("Language")}
        </span>
        <div className="inline-flex rounded-full bg-zinc-200/60 p-1">
          {(
            [
              ["en", "English"],
              ["zh", "简体中文"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="submit"
              name="language"
              value={value}
              disabled={pending || language === value}
              aria-pressed={language === value}
              className={`min-h-11 rounded-full px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-orange-500 ${language === value ? "bg-white text-zinc-950 shadow-sm" : "text-zinc-500 hover:text-zinc-950"} disabled:cursor-default`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {(pending || state.error) && (
        <p role="status" className="mt-2 text-xs text-zinc-500">
          {pending ? t("Saving…") : t(state.error)}
        </p>
      )}
    </form>
  );
}
