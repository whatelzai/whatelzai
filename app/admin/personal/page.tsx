import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Wallet,
  Code,
  Camera,
  Users,
  Briefcase,
  Mic,
  Heart,
  Battery,
  Sun,
  Moon,
  CalendarDays,
  Flower2,
  Dumbbell,
} from "lucide-react";
const areaIcons = [Wallet, Code, Camera, Users, Briefcase, Mic, Heart, Battery];
const areaLabels = [
  "Money",
  "Build",
  "Brand",
  "Network",
  "Work",
  "Teach",
  "Health",
  "Energy",
];
import Link from "@/components/admin/AdminLink";
import { AdminText } from "@/components/admin/AdminPreferences";
import { PersonalWeeklyFocus } from "@/components/admin/PersonalWeeklyFocus";
import { dailyOwner } from "@/lib/daily/server";
import { singaporeDay } from "@/lib/daily/model";
import { focusWeek } from "@/lib/personal/model";
import { personalSources } from "@/lib/personal/server";
import { mandalaGoal, mandalaAreas } from "@/lib/mandala";
import { briefStatus } from "@/lib/admin-overview/model";
import { money } from "@/lib/money/model";
import { adminUrl } from "@/lib/admin-url";
import "./personal.css";
export const metadata: Metadata = {
  title: "Personal — Admin",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
type Sources = ReturnType<typeof personalSources>;
const Text = ({ s }: { s: string }) => <AdminText text={s} />;
export default async function PersonalPage() {
  const owner = await dailyOwner(),
    now = new Date(),
    day = singaporeDay(now),
    week = focusWeek(now);
  const sources = personalSources(owner, day, week.start, now);
  return (
    <div className="personal-home">
      <header className="personal-title">
        <div>
          <h1>
            <Text s="Personal" />
          </h1>
          <p>
            <Text s="This week" /> · {week.start} – {week.end}
          </p>
        </div>
        <Link
          className="personal-primary"
          href={adminUrl("/admin/personal/money?entry=expense")}
        >
          <Text s="Log expense" />
        </Link>
      </header>
      <nav className="personal-tool-shortcuts" aria-label="Personal tools">
        {[
          ["payday", Wallet, "Payday"],
          ["meditation", Flower2, "Meditate"],
          ["training", Dumbbell, "Train"],
          ["practice", Mic, "Practise"],
          ["weekly", CalendarDays, "This week"],
        ].map(([key, Icon, label]) => {
          const I = Icon as typeof Wallet;
          return (
            <Link
              key={String(key)}
              href={adminUrl(`/admin/personal/tools?tool=${key}`)}
            >
              <I size={25} />
              <span>
                <Text s={String(label)} />
              </span>
            </Link>
          );
        })}
      </nav>
      <Suspense fallback={<Placeholder label="My direction" />}>
        <Direction source={sources.direction} />
      </Suspense>
      <div className="personal-main">
        <section className="personal-week">
          <h2>
            <Text s="This week, for myself" />
          </h2>
          <Suspense
            fallback={<Placeholder label="Reading your chosen outcome…" />}
          >
            <Week source={sources.focus} week={week.start} />
          </Suspense>
        </section>
        <section className="personal-money">
          <div className="personal-section-title">
            <h2>
              <Text s="My money" />
            </h2>
            <Link href={adminUrl("/admin/personal/money")}>
              <Text s="Open tracker" />
            </Link>
          </div>
          <Suspense fallback={<Placeholder label="Reading jars and bills…" />}>
            <Money source={sources.money} />
          </Suspense>
        </section>
      </div>
      <section className="personal-rhythm">
        <div className="personal-section-title">
          <h2>
            <Text s="My rhythm" />
          </h2>
          <Link href={adminUrl("/admin/today/routines")}>
            <Text s="Routines" />
          </Link>
        </div>
        <div className="personal-rhythm-grid">
          <Suspense fallback={<Placeholder label="Morning brief" />}>
            <Routine source={sources.morning} kind="morning" now={now} />
          </Suspense>
          <Suspense fallback={<Placeholder label="Evening debrief" />}>
            <Routine source={sources.evening} kind="evening" now={now} />
          </Suspense>
          <Suspense fallback={<Placeholder label="Weekly closeout" />}>
            <Weekly source={sources.weekly} />
          </Suspense>
        </div>
      </section>
      <Suspense fallback={<Placeholder label="My life areas" />}>
        <LifeAreas source={sources.direction} />
      </Suspense>
    </div>
  );
}
function Placeholder({ label }: { label: string }) {
  return (
    <p role="status" className="personal-meta">
      <Text s={label} />…
    </p>
  );
}
async function Direction({ source }: { source: Sources["direction"] }) {
  const result = await source;
  if (result.state !== "ready")
    return (
      <section className="personal-direction">
        <h2>
          <Text s="My direction" />
        </h2>
        <p>
          <Text s="Your saved Mandala is temporarily unavailable." />
        </p>
        <Link href={adminUrl("/admin/personal/mandala")}>
          <Text s="Open my Mandala" />
        </Link>
      </section>
    );
  const goal = mandalaGoal(result.body);
  return (
    <section className="personal-direction">
      <div>
        <h2>
          <Text s="My direction" />
        </h2>
        {goal.figures ? (
          <>
            <p className="personal-goal">
              <Text s="Financial freedom by" /> {goal.figures.age}
            </p>
            <p className="personal-goal-detail">
              SGD {goal.figures.income}
              <Text s="/month in sustainable passive income" />
            </p>
            <p className="personal-meta">
              <Text s="Living-cost baseline" />: SGD {goal.figures.expenses}
              <Text s="/month" /> · <Text s="Proof window" />:{" "}
              {goal.figures.proof}
            </p>
          </>
        ) : (
          <p className="personal-goal-detail">
            {goal.sentence || "Read the current direction in your Mandala."}
          </p>
        )}
      </div>
      <Link href={adminUrl("/admin/personal/mandala")}>
        <Text s="Read my Mandala" /> <span aria-hidden="true">›</span>
      </Link>
    </section>
  );
}
async function Week({
  source,
  week,
}: {
  source: Sources["focus"];
  week: string;
}) {
  const result = await source;
  return (
    <PersonalWeeklyFocus
      key={week}
      initial={result.status === "ready" ? result.data : null}
      week={week}
      available={result.status === "ready"}
    />
  );
}
async function Money({ source }: { source: Sources["money"] }) {
  const result = await source;
  if (result.status !== "ready")
    return (
      <p role="alert">
        <Text s="Your money tracker is temporarily unavailable." />
      </p>
    );
  const { plan, bills } = result.data;
  return (
    <>
      <p className="personal-meta">
        <Text s="Six jars" /> · <Text s="SGD and MYR kept separate" />
      </p>
      {plan ? (
        <div className="personal-money-plan">
          <span>
            <Text s="Monthly jar plan" />
          </span>
          <strong>{money(plan.jar_base_minor, "SGD")}</strong>
          <span>
            <Text s="LTSS reserve target" />
          </span>
          <strong>{money(plan.reserve_target_minor, "SGD")}</strong>
        </div>
      ) : (
        <p>
          <Text s="No jar plan configured." />
        </p>
      )}

      <div className="personal-section-title personal-bill-title">
        <h3>
          <Text s="Next bills" />
        </h3>
        <Link href={adminUrl("/admin/personal/money?view=recurring")}>
          <Text s="Recurring" />
        </Link>
      </div>
      {bills.length ? (
        bills.map((b) => (
          <Link
            key={b.id}
            className="personal-bill"
            href={adminUrl("/admin/personal/money?view=recurring")}
          >
            <span>
              {b.name}
              <small>{b.next_due}</small>
            </span>
            <span>{money(b.amount_minor, b.currency)}</span>
          </Link>
        ))
      ) : (
        <p className="personal-meta">
          <Text s="No recurring expenses recorded yet." />
        </p>
      )}
    </>
  );
}
async function Routine({
  source,
  kind,
  now,
}: {
  source: Sources["morning"];
  kind: "morning" | "evening";
  now: Date;
}) {
  const value = await source;
  return (
    <Link className="personal-routine" href={adminUrl(`/admin/today#${kind}`)}>
      <span
        className={`personal-visual-icon ${kind === "morning" ? "personal-warm" : "personal-lilac"}`}
      >
        {kind === "morning" ? (
          <Sun size={22} aria-hidden="true" />
        ) : (
          <Moon size={22} aria-hidden="true" />
        )}
      </span>
      <span className="personal-routine-copy">
        <Text s={kind === "morning" ? "Morning brief" : "Evening debrief"} />
        <small>
          <Text s={briefStatus(value, kind, now)} />
        </small>
      </span>
      <span aria-hidden="true">›</span>
    </Link>
  );
}
async function Weekly({ source }: { source: Sources["weekly"] }) {
  const value = await source;
  return (
    <Link className="personal-routine" href={adminUrl("/admin/today/weekly")}>
      <span className="personal-visual-icon personal-mint">
        <CalendarDays size={22} aria-hidden="true" />
      </span>
      <span className="personal-routine-copy">
        <Text s="Weekly closeout" />
        <small>
          <Text
            s={
              value.status === "unavailable"
                ? "Unavailable"
                : value.data
                  ? "Last complete week · saved"
                  : "Last complete week · no saved entry"
            }
          />
        </small>
      </span>
      <span aria-hidden="true">›</span>
    </Link>
  );
}
async function LifeAreas({ source }: { source: Sources["direction"] }) {
  const result = await source;
  if (result.state !== "ready") return null;
  const areas = mandalaAreas(result.body);
  return (
    <section className="personal-areas">
      <div className="personal-section-title">
        <h2>
          <Text s="My life, in balance" />
        </h2>
        <Link href={adminUrl("/admin/personal/mandala")}>
          <Text s="Full plan" />
        </Link>
      </div>
      {areas ? (
        <div className="personal-area-list">
          {areas.map((a, i) => {
            const Icon = areaIcons[i] ?? Wallet;
            return (
              <Link
                key={a.title}
                href={adminUrl("/admin/personal/mandala")}
                aria-label={a.title}
              >
                <span className={`personal-visual-icon personal-tone-${i % 4}`}>
                  <Icon size={24} strokeWidth={1.7} aria-hidden="true" />
                </span>
                <Text s={areaLabels[i] ?? a.title.replace(/^\d+\.\s*/, "")} />
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="personal-meta">
          <Text s="Read the current life areas in your Mandala." />
        </p>
      )}
    </section>
  );
}
