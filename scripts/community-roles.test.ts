import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { founderPersona, membershipVisible } from "../lib/communities/model";
test("community roles do not grant another community persona", () => {
  assert.equal(founderPersona([{ slug: "whatelz", code: "oracle" }]), null);
  assert.equal(
    founderPersona([
      { slug: "founders-club", code: "spark" },
      { slug: "whatelz", code: "oracle" },
    ]),
    "Spark",
  );
});
test("schema isolates teams, protects identities, and leaves sponsorship unchanged", async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
 create table users(id uuid primary key); create table business_teams(id uuid primary key);
 create table business_team_people(id uuid primary key,team_id uuid references business_teams(id),sponsor_person_id uuid,unique(team_id,id));
 create table business_team_accounts(user_id uuid,team_id uuid);
 create table member_leads(id uuid primary key,owner_id uuid references users(id),membership text default 'Unknown');
 create table community_calendar_memberships(persona text constraint community_calendar_memberships_persona_check check(persona in ('Oracle','Catalyst','Spark','Guest')));`);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261113151018_community_scoped_roles.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const uid = "00000000-0000-4000-8000-000000000001",
    team = "00000000-0000-4000-8000-000000000002",
    other = "00000000-0000-4000-8000-000000000003",
    person = "00000000-0000-4000-8000-000000000004",
    lead = "00000000-0000-4000-8000-000000000005",
    community = "00000000-0000-4000-8000-000000000006";
  await db.query("insert into users values ($1)", [uid]);
  await db.query("insert into business_teams values ($1),($2)", [team, other]);
  await db.query(
    "insert into business_team_people(id,team_id) values ($1,$2)",
    [person, team],
  );
  await db.query("insert into business_team_accounts values ($1,$2)", [
    uid,
    team,
  ]);
  await db.query("insert into member_leads(id,owner_id) values ($1,$2)", [
    lead,
    uid,
  ]);
  await db.query(
    "insert into weos_communities(id,team_id,slug,name) values ($1,$2,'founders-club','Example')",
    [community, team],
  );
  await db.query(
    "insert into weos_community_roles values ($1,'guest','Guest','Test',0)",
    [community],
  );
  await db.query(
    "insert into weos_community_memberships(community_id,team_id,lead_id,role_code,updated_by) values ($1,$2,$3,'guest',$4)",
    [community, team, lead, uid],
  );
  await assert.rejects(
    db.query("update weos_community_memberships set role_code='oracle'"),
  );
  await assert.rejects(
    db.query("update weos_community_memberships set team_id=$1", [other]),
  );
  await db.query("update weos_community_memberships set metadata=$1", [{}]);
  assert.equal(
    (
      await db.query<{ revision: number }>(
        "select revision from weos_community_memberships",
      )
    ).rows[0].revision,
    2,
  );
  await db.query(
    "update member_leads set referrer_person_id=$1,planned_sponsor_person_id=$1",
    [person],
  );
  assert.equal(
    (
      await db.query<{ sponsor_person_id: string | null }>(
        "select sponsor_person_id from business_team_people",
      )
    ).rows[0].sponsor_person_id,
    null,
  );
  assert.equal(
    (
      await db.query<{ allowed: boolean }>(
        "select has_table_privilege('authenticated','weos_community_memberships','select') allowed",
      )
    ).rows[0].allowed,
    false,
  );
  await db.query(
    "insert into weos_community_roles values ($1,'spark','Spark','Test',1)",
    [community],
  );
  await db.query("update member_leads set membership='Spark'");
  assert.deepEqual(
    (await db.query("select role_code,status from weos_community_memberships"))
      .rows[0],
    { role_code: "spark", status: "active" },
  );
  await db.query("update member_leads set membership='Unknown'");
  assert.deepEqual(
    (await db.query("select role_code,status from weos_community_memberships"))
      .rows[0],
    { role_code: "guest", status: "proposed" },
  );
  const foreignPerson = "00000000-0000-4000-8000-000000000007";
  await db.query(
    "insert into business_team_people(id,team_id) values ($1,$2)",
    [foreignPerson, other],
  );
  await assert.rejects(
    db.query("update member_leads set planned_sponsor_person_id=$1", [
      foreignPerson,
    ]),
  );
  await db.close();
});

test("hidden Baobeis remain hidden in the community roster, including for admin", () => {
  const allowed = new Set(["visible"]);
  const people = new Set(["person"]);
  assert.equal(
    membershipVisible(
      { status: "active", lead_id: "hidden", person_id: "person" },
      true,
      allowed,
      people,
    ),
    false,
  );
  assert.equal(
    membershipVisible(
      { status: "proposed", lead_id: "visible", person_id: null },
      false,
      allowed,
      people,
    ),
    false,
  );
  assert.equal(
    membershipVisible(
      { status: "active", lead_id: "visible", person_id: null },
      false,
      allowed,
      people,
    ),
    true,
  );
});
