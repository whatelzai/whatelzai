import test from "node:test";
import assert from "node:assert/strict";
import {
  monthCells,
  shiftMonth,
  validMonth,
  browseItems,
} from "../lib/public-events/calendar";
import {
  projectEvent,
  nextWeeklyEvent,
  type CatalogRow,
} from "../lib/public-events/catalog";
const event = (id: string, date: string, format = "weekly", listed?: string) =>
  projectEvent({
    id,
    type: "training",
    slug: id,
    name: id,
    date,
    location: null,
    published: true,
    metadata: { event_id: id, event_format: format, public_visibility: listed },
  } as CatalogRow)!;
test("calendar uses Monday-first Gregorian month cells across December and January, including leap years", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2027-01", -1), "2026-12");
  const cells = monthCells("2027-01");
  assert.equal(cells.indexOf("2027-01-07") % 7, 3);
  assert.equal(cells.indexOf("2027-01-09") % 7, 5);
  assert.equal(cells.length % 7, 0);
  assert.equal(monthCells("2028-02").filter(Boolean).length, 29);
  assert.equal(monthCells("2027-02").filter(Boolean).length, 28);
  for (const v of ["2027-13", "2027-00", "oops", "1999-12", "2101-01"])
    assert.equal(validMonth(v), false);
  assert.equal(validMonth("2027-01"), true);
});
test("explicitly listed intensive appears in browsing but never takes the evergreen weekly slot", () => {
  const weekly = event("ELZ-EVT-0008", "2027-01-07"),
    ami = event("ELZ-EVT-0009", "2027-01-09", "intensive", "listed"),
    hidden = event("private", "2027-01-06", "intensive");
  const now = Date.parse("2027-01-01T12:00:00+08:00");
  assert.deepEqual(
    browseItems([ami, hidden, weekly], now).map((e) => e.id),
    ["ELZ-EVT-0008", "ELZ-EVT-0009"],
  );
  assert.equal(nextWeeklyEvent([ami, weekly], now)?.id, weekly.id);
  assert.equal(nextWeeklyEvent([ami], now), null);
});
test("browser payload excludes source metadata, event keys and private notes; past attendance remains distinct", () => {
  const row = {
    id: "uuid",
    type: "training",
    slug: "session",
    name: "Session",
    date: "2026-12-10",
    location: null,
    published: true,
    metadata: {
      event_id: "ELZ-EVT-0006",
      event_key: "PRIVATE_KEY",
      secret: "PRIVATE_NOTE",
      public_visibility: "listed",
    },
  } as CatalogRow;
  const e = projectEvent(row)!;
  e.attended = 4;
  const item = browseItems([e], Date.parse("2027-01-01"))[0];
  assert.equal(item.past, true);
  assert.equal(item.attended, 4);
  assert.ok(!JSON.stringify(item).includes("PRIVATE"));
  assert.equal(item.path, "/events/ELZ-EVT-0006");
});
