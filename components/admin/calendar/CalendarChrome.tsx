"use client";
import { Suspense } from "react";
import { AdminBackTrail } from "../AdminBackTrail";
import { CalendarWeekdays } from "./CalendarWeekdays";
export function CalendarChrome({ pathname }: { pathname: string }) {
  return (
    <div className="admin-calendar-chrome">
      <Suspense
        fallback={
          <div className="admin-calendar-back-placeholder" aria-hidden="true" />
        }
      >
        <AdminBackTrail pathname={pathname} />
      </Suspense>
      <CalendarWeekdays />
    </div>
  );
}
