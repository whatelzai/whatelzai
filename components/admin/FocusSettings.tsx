"use client";
import { useAdminPreferences } from "./AdminPreferences";
import { useState } from "react";
import { adminWorkstreams } from "@/lib/admin-navigation";
import {
  DEFAULT_FOCUS,
  minuteInput,
  parseMinute,
  validFocusSettings,
  type FocusSettings,
  type FocusBlock,
} from "@/lib/admin-focus";
import { useAdminFocus } from "./AdminFocus";
export function FocusSettingsCard() {
  const focus = useAdminFocus();
  const { t } = useAdminPreferences();
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<FocusSettings | null>(null),
    [notice, setNotice] = useState("");
  if (!focus) return null;
  const settings = draft ?? focus.settings;
  function update(index: number, change: Partial<FocusBlock>) {
    setDraft({
      ...settings,
      blocks: settings.blocks.map((block, i) =>
        i === index ? { ...block, ...change } : block,
      ),
    });
    setNotice("");
  }
  return (
    <section
      id="focus-schedule"
      aria-labelledby="focus-schedule-heading"
      className="scroll-mt-24 py-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="focus-schedule-heading" className="font-semibold">
            {t("Automatic switching")}
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            {t("Asia/Singapore · saved on this device")}
          </p>
        </div>
        <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={focus.settings.enabled}
            disabled={!focus.ready}
            onChange={(event) =>
              focus.save({ ...focus.settings, enabled: event.target.checked })
            }
            className="admin-auto-switch"
          />
          <span className="sr-only">{t("Automatic switching")}</span>
        </label>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {focus.block
          ? `${t("Scheduled now")}: ${t(focus.block.space)}`
          : t("Checking schedule…")}
      </p>
      {focus.pushSync === "error" && (
        <p role="alert" className="mt-3 text-xs text-amber-800">
          {t(
            "Schedule saved locally. Push alerts haven’t synced; reopen Admin online to retry.",
          )}
        </p>
      )}
      <details
        className="mt-2"
        onToggle={(event) => {
          setEditorOpen(event.currentTarget.open);
          if (event.currentTarget.open) {
            setDraft(focus.settings);
            setNotice("");
          }
        }}
      >
        <summary className="min-h-11 cursor-pointer text-sm font-medium">
          {t("Edit timetable")}
        </summary>
        {editorOpen && (
          <>
            <dl className="mt-5 divide-y divide-zinc-100 text-sm">
              {focus.settings.blocks.map((block, i) => (
                <div
                  key={i}
                  className="flex flex-wrap justify-between gap-2 py-3"
                >
                  <dt className="text-zinc-500">
                    {t(block.days === "weekdays" ? "Mon–Fri" : "Sat–Sun")}
                    {t("·")} {minuteInput(block.start)}
                    {t("–")}
                    {block.end === 1440 ? "24:00" : minuteInput(block.end)}
                  </dt>
                  <dd className="font-medium">{t(block.space)}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              disabled={!focus.ready}
              onClick={focus.follow}
              className="mt-5 min-h-11 rounded-xl bg-yellow-300 px-4 text-sm font-medium disabled:opacity-50"
            >
              {t("Follow schedule now →")}
            </button>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!validFocusSettings(settings)) {
                  setNotice(
                    "Check that every block ends after it starts and that times on the same days do not overlap.",
                  );
                  return;
                }
                const persisted = focus.save(settings);
                setNotice(
                  persisted
                    ? "Schedule saved on this device."
                    : "Saved for this session; browser storage is unavailable.",
                );
              }}
              className="mt-4 space-y-4"
            >
              {settings.blocks.map((block, i) => (
                <fieldset
                  key={i}
                  className="grid min-w-0 gap-3 rounded-xl bg-zinc-50 p-4 sm:grid-cols-2 lg:grid-cols-5"
                >
                  <legend className="sr-only">
                    {t("Time block")} {i + 1}
                  </legend>
                  <label className="text-xs text-zinc-500">
                    {t("Days")}
                    <select
                      value={block.days}
                      onChange={(e) =>
                        update(i, {
                          days: e.target.value as FocusBlock["days"],
                        })
                      }
                      className="mt-1 min-h-11 w-full rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-950"
                    >
                      <option value="weekdays">{t("Mon–Fri")}</option>
                      <option value="weekends">{t("Sat–Sun")}</option>
                    </select>
                  </label>
                  <label className="text-xs text-zinc-500">
                    {t("Starts")}
                    <input
                      type="time"
                      required
                      value={minuteInput(block.start)}
                      onChange={(e) =>
                        update(i, { start: parseMinute(e.target.value) })
                      }
                      className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-950"
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    {t("Ends")}
                    <input
                      type="time"
                      required
                      value={minuteInput(block.end)}
                      onChange={(e) =>
                        update(i, { end: parseMinute(e.target.value, true) })
                      }
                      className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-950"
                    />
                  </label>
                  <label className="text-xs text-zinc-500">
                    {t("Space")}
                    <select
                      value={block.space}
                      onChange={(e) =>
                        update(i, {
                          space: e.target.value as FocusBlock["space"],
                        })
                      }
                      className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-zinc-200 bg-white px-2 text-sm text-zinc-950"
                    >
                      {adminWorkstreams.map((item) => (
                        <option key={item.label} value={item.label}>
                          {t(item.label)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        ...settings,
                        blocks: settings.blocks.filter(
                          (_, index) => index !== i,
                        ),
                      })
                    }
                    className="min-h-11 self-end rounded-lg border border-zinc-200 px-3 text-xs"
                  >
                    {t("Remove block")} {i + 1}
                  </button>
                </fieldset>
              ))}
              <p className="text-xs text-zinc-500">
                {t(
                  "End time 00:00 means midnight at the end of the day. Split overnight schedules into separate blocks.",
                )}
              </p>
              <button
                type="button"
                disabled={settings.blocks.length >= 24}
                onClick={() =>
                  setDraft({
                    ...settings,
                    blocks: [
                      ...settings.blocks,
                      {
                        days: "weekends",
                        start: 1080,
                        end: 1140,
                        space: "Overview",
                      },
                    ],
                  })
                }
                className="min-h-11 rounded-xl border px-4 text-sm disabled:opacity-50"
              >
                {t("Add time block")}
              </button>
              <label className="block text-sm">
                {t("When I manually choose a space")}
                <select
                  value={settings.override}
                  onChange={(e) =>
                    setDraft({
                      ...settings,
                      override: e.target.value as FocusSettings["override"],
                    })
                  }
                  className="mt-2 block min-h-11 w-full rounded-xl border border-zinc-200 bg-white px-3"
                >
                  <option value="block">
                    {t("Keep it until the next time block")}
                  </option>
                  <option value="manual">
                    {t("Keep it until I resume automatic switching")}
                  </option>
                </select>
              </label>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="min-h-11 rounded-xl bg-zinc-950 px-5 text-sm font-medium text-white"
                >
                  {t("Save timetable")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(DEFAULT_FOCUS);
                    setNotice(
                      "Defaults loaded for review. Save to apply them.",
                    );
                  }}
                  className="min-h-11 rounded-xl border px-4 text-sm"
                >
                  {t("Load defaults")}
                </button>
              </div>
              <p role="status" className="text-sm text-zinc-600">
                {t(notice)}
              </p>
            </form>
          </>
        )}
      </details>
    </section>
  );
}
