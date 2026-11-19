"use client";
import { useId, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
type Option = { value: string; label: string };
export function MobilePicker({
  name,
  label,
  options,
  value,
  defaultValue,
  onChange,
}: {
  name: string;
  label: string;
  options: readonly Option[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [local, setLocal] = useState(defaultValue ?? options[0]?.value ?? "");
  const [open, setOpen] = useState(false);
  const selected = value ?? local;
  const choose = (next: string) => {
    setLocal(next);
    onChange?.(next);
    dialog.current?.close();
  };
  const show = () => {
    dialog.current?.showModal();
    setOpen(true);
    const buttons = dialog.current?.querySelectorAll<HTMLButtonElement>(
      "[data-picker-option]",
    );
    const index = Math.max(
      0,
      options.findIndex((x) => x.value === selected),
    );
    buttons?.[index]?.focus({ preventScroll: true });
    buttons?.[index]?.scrollIntoView({ block: "nearest" });
  };
  return (
    <div className="min-w-0">
      <span
        id={`${id}-label`}
        className="block text-sm font-medium text-zinc-600"
      >
        {label}
      </span>
      <input type="hidden" name={name} value={selected} />
      <button
        ref={trigger}
        type="button"
        className="fcos-lead-picker mt-2 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-zinc-50/70 px-4 py-3 text-left text-base text-zinc-900 transition-colors active:bg-zinc-100"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-dialog`}
        onClick={show}
      >
        <span id={`${id}-value`}>
          {options.find((x) => x.value === selected)?.label ?? "Choose"}
        </span>
        <ChevronDown
          size={18}
          className="shrink-0 text-zinc-400"
          aria-hidden="true"
        />
      </button>
      <dialog
        ref={dialog}
        id={`${id}-dialog`}
        aria-labelledby={`${id}-title`}
        className="fcos-picker-dialog fixed inset-x-3 bottom-3 top-auto mx-auto mb-0 mt-auto max-h-[min(75dvh,640px)] w-[calc(100%_-_24px)] max-w-lg overflow-hidden rounded-[28px] border-0 bg-white p-4 text-zinc-900 shadow-2xl backdrop:bg-zinc-900/25 sm:inset-0 sm:my-auto sm:h-fit sm:p-5"
        onClose={() => {
          setOpen(false);
          trigger.current?.focus({ preventScroll: true });
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <div className="flex items-center justify-between gap-4 px-2 pb-3">
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {label}
          </h2>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label={`Close ${label} picker`}
            className="fcos-lead-picker flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div
          className="max-h-[calc(75dvh-120px)] space-y-1 overflow-y-auto overscroll-contain rounded-2xl"
          onKeyDown={(e) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key))
              return;
            const buttons = [
              ...(dialog.current?.querySelectorAll<HTMLButtonElement>(
                "[data-picker-option]",
              ) ?? []),
            ];
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            if (index < 0) return;
            e.preventDefault();
            const next =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? buttons.length - 1
                  : (index +
                      (e.key === "ArrowDown" ? 1 : -1) +
                      buttons.length) %
                    buttons.length;
            buttons[next]?.focus();
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              data-picker-option
              aria-pressed={selected === option.value}
              onClick={() => choose(option.value)}
              className={`fcos-lead-picker flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left text-base ${selected === option.value ? "bg-amber-50 text-zinc-900" : "text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100"}`}
            >
              <span>{option.label}</span>
              {selected === option.value && (
                <Check
                  size={18}
                  className="shrink-0 text-amber-700"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      </dialog>
    </div>
  );
}
