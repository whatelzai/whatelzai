import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import {
  feedbackFormConfig,
  validFeedbackAnswers,
  verifiedFeedbackInput,
  feedbackSnapshot,
} from "../lib/event-feedback/questions";
const config = feedbackFormConfig.parse(
  JSON.parse(
    readFileSync("content/event-feedback/feedback-v3-20261118.json", "utf8"),
  ),
);
const answers = Object.fromEntries(
  config.questions.map((q) => [
    q.id,
    q.type === "rating" ? 4 : q.type === "text" ? "" : false,
  ]),
);
const event = "d61b02e0-76c3-422c-b65d-e9ec570d7ff2",
  reg = "00000000-0000-4000-8000-000000000003",
  challenge = "00000000-0000-4000-8000-000000000004",
  response = "00000000-0000-4000-8000-000000000005";
test("versioned configuration has ten typed questions and accepts No without accepting missing/extra answers", () => {
  assert.equal(config.questions.length, 10);
  assert.equal(config.questions.filter((q) => q.type === "rating").length, 6);
  assert.equal(config.questions[0].text, "Do you like this mode of training?");
  assert.equal(config.questions[1].id, "engagement");
  assert.ok(validFeedbackAnswers(config, answers));
  assert.ok(
    validFeedbackAnswers(config, {
      ...answers,
      comments: "Long comment. ".repeat(10000),
    }),
  );
  assert.equal(
    feedbackFormConfig.safeParse({
      ...config,
      questions: [...config.questions, config.questions[0]],
    }).success,
    false,
  );
  for (const changed of [
    { ...answers, format: "no" },
    { ...answers, engagement: 6 },
    { ...answers, extra: true },
  ])
    assert.equal(validFeedbackAnswers(config, changed as never), false);
  const incomplete = { ...answers };
  delete incomplete.pace;
  assert.equal(validFeedbackAnswers(config, incomplete), false);
  assert.equal(
    verifiedFeedbackInput.safeParse({
      eventId: "ELZ-EVT-0004",
      requestId: response,
      rating: 5,
    }).success,
    false,
  );
  assert.equal(
    feedbackFormConfig.safeParse({
      ...config,
      questions: [config.questions[0], config.questions[0]],
    }).success,
    false,
  );
});
async function fixture() {
  const db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create role service_role;create table public.events(id uuid primary key,date date,published boolean,metadata jsonb);create table public.event_registrations(id uuid primary key,event_key text,status text);insert into events values('${event}','2026-11-12',true,'{"event_id":"ELZ-EVT-0004","event_key":"nov12","ends_at":"2026-11-12T21:30:00+08:00"}');insert into event_registrations values('${reg}','nov12','confirmed');grant select on events,event_registrations to service_role;`,
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261116093000_event_feedback.sql",
      "utf8",
    ),
  );
  await db.query("select public.submit_event_feedback($1,$2,3,$3,$4)", [
    "00000000-0000-4000-8000-000000000010",
    event,
    "Original comment",
    "f".repeat(64),
  ]);
  await db.exec(
    readFileSync(
      "supabase/migrations/20261118090000_versioned_verified_feedback.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261118090100_feedback_review_compatibility.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261118100000_approved_feedback_questions.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261118100100_require_verified_feedback_writer.sql",
      "utf8",
    ),
  );
  return db;
}
const issue = (
  db: PGlite,
  id = challenge,
  registration: string | null = reg,
  email = "a".repeat(64),
) =>
  db.query("select public.issue_event_feedback_code($1,$2,$3,$4,$5,$6)", [
    id,
    event,
    registration,
    email,
    "b".repeat(64),
    "c".repeat(64),
  ]);
const verify = (
  db: PGlite,
  id = challenge,
  code = "b".repeat(64),
  target = event,
) =>
  db.query<{ verify_event_feedback_code: boolean }>(
    "select public.verify_event_feedback_code($1,$2,$3,$4)",
    [id, target, code, "d".repeat(64)],
  );
const submit = (
  db: PGlite,
  id = response,
  data: unknown = answers,
  token = "d".repeat(64),
  target = event,
  form = config.id,
) =>
  db.query(
    "select public.submit_verified_event_feedback($1,$2,$3,$4,$5,$6,$7)",
    [id, target, challenge, token, form, JSON.stringify(data), "c".repeat(64)],
  );
test("database verifies registration ownership, keeps immutable question snapshots, and deduplicates/conflicts safely", async () => {
  const db = await fixture();
  try {
    await issue(db);
    assert.equal(
      (await verify(db, challenge, "e".repeat(64))).rows[0]
        .verify_event_feedback_code,
      false,
    );
    await assert.rejects(submit(db), /VERIFICATION_REQUIRED/);
    assert.equal((await verify(db)).rows[0].verify_event_feedback_code, true);
    await assert.rejects(
      submit(db, response, answers, "e".repeat(64)),
      /VERIFICATION_REQUIRED/,
    );
    await assert.rejects(
      submit(db, response, answers, "d".repeat(64), event, "wrong-form"),
      /INVALID_FEEDBACK/,
    );
    await assert.rejects(
      submit(db, response, { ...answers, format: "false" }),
      /INVALID_FEEDBACK/,
    );
    await submit(db, response, { ...answers, comments: "A".repeat(20000) });
    await submit(db, response, { ...answers, comments: "A".repeat(20000) });
    await assert.rejects(
      submit(db, response, { ...answers, format: true }),
      /CONFLICT/,
    );
    await assert.rejects(
      submit(db, "00000000-0000-4000-8000-000000000006"),
      /ALREADY_SUBMITTED/,
    );
    const rows = await db.query<{ question_answers: unknown; form_id: string }>(
      "select question_answers,form_id from event_feedback where id=$1",
      [response],
    );
    const pairs = feedbackSnapshot.parse(rows.rows[0].question_answers);
    assert.equal(pairs.length, 10);
    assert.deepEqual(
      pairs.map((p) => p.question),
      config.questions.map((q) => q.text),
    );
    assert.equal(String(pairs[9].answer).length, 20000);
    assert.equal(pairs[0].answer, false);
    assert.equal(pairs[0].question, config.questions[0].text);
    const legacy = await db.query<{ comment: string; form_id: string }>(
      "select comment,form_id from event_feedback where form_id=$1",
      ["feedback-v1"],
    );
    assert.equal(legacy.rows[0].comment, "Original comment");
    await assert.rejects(
      db.exec(
        "update event_feedback_forms set title='Changed' where id='" +
          config.id +
          "'",
      ),
      /IMMUTABLE/,
    );
    await assert.rejects(
      db.exec("update event_feedback_form_bindings set form_id='feedback-v1'"),
      /IMMUTABLE/,
    );
    await db.exec("set role anon");
    await assert.rejects(
      db.query("select * from event_feedback_verifications"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select * from event_feedback_forms"),
      /permission denied/,
    );
    await assert.rejects(submit(db), /permission denied/);
    await db.exec("reset role;set role service_role");
    await assert.rejects(
      db.query("select public.submit_event_feedback($1,$2,3,$3,$4)", [
        response,
        event,
        "",
        "a".repeat(64),
      ]),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
test("unknown emails, expired challenges, cancelled registrations and five bad guesses cannot submit", async () => {
  const db = await fixture();
  try {
    await issue(db);
    for (let i = 0; i < 5; i++)
      assert.equal(
        (await verify(db, challenge, "e".repeat(64))).rows[0]
          .verify_event_feedback_code,
        false,
      );
    assert.equal((await verify(db)).rows[0].verify_event_feedback_code, false);
    const unknown = "00000000-0000-4000-8000-000000000020";
    await issue(db, unknown, null, "e".repeat(64));
    assert.equal(
      (await verify(db, unknown)).rows[0].verify_event_feedback_code,
      false,
    );
    await assert.rejects(
      issue(db, "00000000-0000-4000-8000-000000000021"),
      /RATE_LIMIT/,
    );
    await db.exec(
      "update event_feedback_verifications set attempts=0,expires_at=now()-interval '1 second'",
    );
    assert.equal((await verify(db)).rows[0].verify_event_feedback_code, false);
    await db.exec(
      "update event_feedback_verifications set expires_at=now()+interval '10 minutes';update event_registrations set status='cancelled'",
    );
    assert.equal((await verify(db)).rows[0].verify_event_feedback_code, false);
  } finally {
    await db.close();
  }
});
