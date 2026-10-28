"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveMemberLanguage } from "@/app/profile/language-actions";
import { memberText, type MemberLanguage } from "@/lib/fcos/language";

export function LanguageWelcome() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [language, setLanguage] = useState<MemberLanguage>("en");
  const [state, action, pending] = useActionState(saveMemberLanguage, {
    error: "",
  });
  const t = (text: string) => memberText(language, text);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previous = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      element.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="language-welcome-title"
      aria-describedby="language-welcome-description"
      onCancel={(event) => event.preventDefault()}
      className="fcos-language-welcome fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[calc(100%_-_32px)] max-w-sm overflow-y-auto rounded-3xl border-0 bg-white p-6 text-zinc-950 shadow-2xl backdrop:bg-zinc-950/30"
    >
      <p className="mb-5 text-lg font-bold tracking-tight">
        fc<span className="text-yellow-500">OS</span>
      </p>
      <h2
        id="language-welcome-title"
        tabIndex={-1}
        autoFocus
        className="text-2xl font-semibold tracking-tight outline-none"
      >
        {t("Select your preferred language")}
      </h2>
      <p
        id="language-welcome-description"
        className="mt-2 text-sm leading-6 text-zinc-500"
      >
        {t("You can change this later in Profile.")}
      </p>
      <form action={action} aria-busy={pending} className="mt-6">
        <fieldset disabled={pending} className="space-y-2">
          <legend className="sr-only">English / 简体中文</legend>
          {(
            [
              ["en", "English"],
              ["zh", "简体中文"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className={`flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-base font-medium ${language === value ? "border-zinc-900 bg-zinc-50" : "border-zinc-200"}`}
            >
              <span lang={value === "zh" ? "zh-Hans" : "en"}>{label}</span>
              <input
                type="radio"
                name="language"
                value={value}
                checked={language === value}
                onChange={() => setLanguage(value)}
                className="h-5 w-5 accent-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-yellow-600"
              />
            </label>
          ))}
        </fieldset>
        {state.error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {t(state.error)}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 min-h-12 w-full rounded-2xl bg-yellow-300 px-4 py-3 text-base font-semibold text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600 disabled:opacity-60"
        >
          {t(pending ? "Saving…" : "Continue")}
        </button>
      </form>
    </dialog>
  );
}
