"use client";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { hqhRequest } from "@/lib/fcos/hqh-request";
export function CreateHqh({
  people,
  disabled,
  onCreate,
}: {
  people: { id: string; name: string }[];
  disabled: boolean;
  onCreate: (prompt: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [language, setLanguage] = useState<"en" | "zh">("en"),
    [context, setContext] = useState("");
  return (
    <div className="mx-auto w-full max-w-3xl px-2 md:px-5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => dialog.current?.showModal()}
        className="min-h-11 rounded-full px-3 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
      >
        + Create HQH
      </button>
      <dialog
        ref={dialog}
        className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_32px)] max-w-md overflow-y-auto rounded-3xl border-0 bg-white p-5 text-zinc-900 shadow-xl backdrop:bg-black/30"
        aria-labelledby="create-hqh-title"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const names = selected.map(
              (id) => people.find((p) => p.id === id)!.name,
            );
            dialog.current?.close();
            onCreate(hqhRequest(names, language, context));
          }}
          className="space-y-4"
        >
          <header className="flex items-center justify-between">
            <h2 id="create-hqh-title" className="text-lg font-semibold">
              Create HQH
            </h2>
            <button
              type="button"
              aria-label="Close HQH selection"
              onClick={() => dialog.current?.close()}
              className="flex size-11 items-center justify-center"
            >
              <X size={18} />
            </button>
          </header>
          <input
            aria-label="Search Baobeis for HQH"
            type="search"
            placeholder="Search Baobeis…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-11 w-full rounded-full border border-zinc-200 px-4 text-base"
          />
          <fieldset className="max-h-[35dvh] overflow-y-auto">
            <legend className="mb-2 text-sm text-zinc-500">
              Select up to six · {selected.length} selected
            </legend>
            {people
              .filter((p) =>
                p.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((p) => (
                <label
                  key={p.id}
                  className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-zinc-100 py-2"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    disabled={!selected.includes(p.id) && selected.length >= 6}
                    onChange={(e) =>
                      setSelected((old) =>
                        e.target.checked
                          ? [...old, p.id]
                          : old.filter((id) => id !== p.id),
                      )
                    }
                    className="size-5 accent-zinc-900"
                  />
                  <span>{p.name}</span>
                  {selected.includes(p.id) && (
                    <span className="ml-auto text-xs text-zinc-500">
                      {selected.indexOf(p.id) + 1}
                    </span>
                  )}
                </label>
              ))}
            {!people.length && (
              <p className="py-4 text-sm text-zinc-500">
                No Baobeis available. Refresh to try again.
              </p>
            )}
          </fieldset>
          <fieldset className="flex gap-2">
            <legend className="mb-2 text-sm">Language</legend>
            {(["en", "zh"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={language === value}
                onClick={() => setLanguage(value)}
                className={`min-h-11 rounded-full px-4 text-sm ${language === value ? "bg-zinc-900 text-white" : "bg-zinc-100"}`}
              >
                {value === "en" ? "English" : "中文"}
              </button>
            ))}
          </fieldset>
          <label className="block text-sm">
            Additional context (optional)
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={2}
              maxLength={1500}
              placeholder="Any new updates or a particular meeting…"
              className="mt-2 w-full rounded-2xl border border-zinc-200 p-3 text-base"
            />
          </label>
          <button
            type="submit"
            disabled={!selected.length || disabled}
            className="min-h-12 w-full rounded-full bg-weos-yellow px-4 font-medium disabled:opacity-40"
          >
            Create HQH
          </button>
        </form>
      </dialog>
    </div>
  );
}
