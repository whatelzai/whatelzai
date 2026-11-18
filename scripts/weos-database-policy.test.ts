import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
const uid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
test("database context scopes and RLS hold under real authenticated roles, not prompt text", async () => {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; grant usage on schema auth to authenticated; create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table users(id uuid primary key,supabase_auth_user_id uuid,role text);
 create table business_team_accounts(user_id uuid,person_id uuid,team_id uuid);
 create table business_team_people(id uuid,team_id uuid,abo_status text,display_name text);
 create table weos_communities(id uuid,team_id uuid,slug text,name text);
 create table weos_community_memberships(id uuid,community_id uuid,team_id uuid,person_id uuid,lead_id uuid,role_code text,status text);
 create table member_leads(id uuid primary key,owner_id uuid,name text,membership text,relationship text,story text,interests text,concerns text,next_action text,follow_up_on date,metadata jsonb,visibility text);
 create table member_briefings(id uuid primary key,owner_id uuid,lead_ids uuid[],title text,kind text,status text,event_name text,occurred_on date,updated_at timestamptz,observations text,reflections text,next_steps text,visibility text);
 create table member_lead_activities(id uuid,lead_id uuid,title text,activity_on date,status text,notes text);
 create table member_knowledge_collections(id text primary key,kind text constraint member_knowledge_collections_kind_check check(kind in ('culture','product-class','pipeline','marketing-plan')),title text,position int,published bool,updated_at timestamptz); alter table member_knowledge_collections enable row level security;
 create table member_knowledge_entries(id text,collection_id text,title text,body text,position int,published bool,updated_at timestamptz); alter table member_knowledge_entries enable row level security;
 create table member_ai_conversations(id uuid,user_id uuid,title text,created_at timestamptz); alter table member_ai_conversations enable row level security;
 create table member_ai_messages(id uuid,user_id uuid,conversation_id uuid,body text,role text default 'user'); alter table member_ai_messages enable row level security;
 create table product_catalogue_sources(id text,market text,currency text,edition_date date,source_url text);
 create table product_catalogue_listings(source_id text,sku text,name text,brand text,category text,pack text,pv numeric,pv_max numeric,pv_status text,bv numeric,bv_max numeric,bv_status text,ap numeric,ap_max numeric,ap_status text,rp numeric,rp_max numeric,rp_status text);
 create table daily_tasks(id uuid,owner_id uuid,title text,lane text,due_on date,status text);
 create table social_posts(owner_id uuid,body text,permalink text,published_at timestamptz);
 create table events(id uuid,name text,date timestamptz,location text,metadata jsonb,published bool,type text);
 create table community_calendar_imports(id text,imported_at timestamptz);
 create table community_calendar_records(import_id text,id text,uid text,recurrence_id text,sequence int,revision_at timestamptz,message_id text,received_at timestamptz,ics text);
 create function can_read_member_lead(p_viewer uuid,p_lead uuid) returns bool language sql as $$select exists(select 1 from public.member_leads where id=p_lead and (owner_id=p_viewer or visibility='team'))$$;
 create function can_read_member_briefing(p_viewer uuid,p_note uuid) returns bool language sql as $$select exists(select 1 from public.member_briefings where id=p_note and (owner_id=p_viewer or visibility='team'))$$;
 `);
  await db.exec(
    fs.readFileSync(
      new URL(
        "../supabase/migrations/20261118120326_weos_role_context_policy.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    fs.readFileSync(
      new URL(
        "../supabase/migrations/20261118121728_weos_hqh_name_resolution.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    fs.readFileSync(
      new URL(
        "../supabase/migrations/20261118123219_weos_conversation_scope.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const community = uid(100),
    team = uid(101);
  await db.query(
    "insert into weos_communities values($1,$2,'whatelz','Whatelz')",
    [community, team],
  );
  for (const [n, role] of [
    [1, "beacon"],
    [2, "blaze"],
    [3, "torch"],
    [4, "ember"],
    [5, "guest"],
    [6, "catalyst"],
  ] as const) {
    await db.query("insert into users values($1,$2,$3)", [
      uid(n),
      uid(n + 10),
      n === 1 ? "superadmin" : "unauthorized",
    ]);
    await db.query("insert into business_team_accounts values($1,$2,$3)", [
      uid(n),
      uid(n + 30),
      team,
    ]);
    await db.query("insert into business_team_people values($1,$2,$3,$4)", [
      uid(n + 30),
      team,
      "ABO",
      "Person " + n,
    ]);
    await db.query(
      "insert into weos_community_memberships values($1,$2,$3,$4,null,$5,'active')",
      [uid(n + 50), community, team, uid(n + 30), role],
    );
  }
  await db.query(
    "insert into member_leads values($1,$2,'Profile Alpha','Spark','Known','Reported story','AI','Time','Follow up',null,$3,'private')",
    [
      uid(200),
      uid(2),
      JSON.stringify({
        poti_status: "not_yet",
        secret_metadata: "MUST NOT LEAVE DB",
        hqh_intakes: [],
      }),
    ],
  );
  await db.query(
    "insert into member_leads values($1,$2,'Profile Beta','Spark','Known','Story','AI','','',null,'{}','team')",
    [uid(201), uid(3)],
  );
  await db.query(
    "insert into member_briefings values($1,$2,$3,'Private followup','HHH','draft','',current_date,now(),'Observed','Reflection','Next','private')",
    [uid(202), uid(2), [uid(200)]],
  );
  for (const [id, kind, published] of [
    ["ai", "ai-learning", true],
    ["business", "culture", true],
    ["draft", "ai-learning", false],
  ] as const) {
    await db.query(
      "insert into member_knowledge_collections values($1,$2,$1,0,$3,now())",
      [id, kind, published],
    );
    await db.query(
      "insert into member_knowledge_entries values($1,$1,$1,$2,0,true,now())",
      [id, id + " lesson"],
    );
  }
  await db.query(
    "insert into member_ai_conversations(id,user_id,title,created_at) values($1,$2,'Private conversation',now()),($3,$4,'Other conversation',now())",
    [uid(210), uid(2), uid(211), uid(4)],
  );
  await db.query(
    "insert into member_ai_messages(id,user_id,conversation_id,body) values($1,$2,$3,'Blaze private chat'),($4,$5,$6,'Ember private chat')",
    [uid(212), uid(2), uid(210), uid(213), uid(4), uid(211)],
  );
  const asRole = async (n: number) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
      uid(n + 10),
    ]);
    await db.exec("set role authenticated");
  };
  const context = async (source: string, query = "") =>
    (
      await db.query<{ result: Record<string, unknown> }>(
        "select public.weos_read_context($1,$2) result",
        [source, query],
      )
    ).rows[0].result;
  await asRole(4);
  assert.deepEqual(
    (
      await db.query<{ body: string }>("select body from member_ai_messages")
    ).rows.map((x) => x.body),
    ["Ember private chat"],
  );
  assert.deepEqual(
    (
      await db.query<{ id: string }>("select id from member_knowledge_entries")
    ).rows.map((x) => x.id),
    ["ai"],
  );
  assert.equal(((await context("learning")).items as unknown[]).length, 1);
  for (const source of [
    "hqh",
    "hqh_discover",
    "leads",
    "briefings",
    "culture",
    "products",
    "social",
    "communities",
  ])
    await assert.rejects(
      context(source, "Profile Alpha"),
      /unavailable for Ember/,
    );
  await assert.rejects(
    db.query("select * from member_leads"),
    /permission denied/,
  );
  await assert.rejects(
    db.query("update member_ai_messages set body='changed'"),
    /permission denied/,
  );
  await asRole(3);
  assert.equal(((await context("leads")).items as unknown[]).length, 1);
  assert.deepEqual(
    (await db.query("select body from member_ai_messages")).rows,
    [],
  );
  const denied = await context("hqh", "Profile Alpha");
  assert.equal((denied.items as unknown[]).length, 0);
  await asRole(2);
  const own = await context("hqh", "Profile Alpha");
  assert.ok(own.person);
  assert.equal(
    (own.metadata as Record<string, unknown>).secret_metadata,
    undefined,
  );
  assert.equal((own.followups as unknown[]).length, 1);
  assert.equal(
    (await db.query("select body from member_ai_messages")).rows.length,
    1,
  );
  await asRole(1);
  assert.equal(((await context("leads")).items as unknown[]).length, 2);
  assert.equal(
    (await db.query("select body from member_ai_messages")).rows.length,
    2,
  );
  assert.equal(
    (await db.query("select * from member_ai_conversations")).rows.length,
    2,
  );
  // Compile and execute every source branch, including empty authorized sources.
  for (const source of [
    "hqh_discover",
    "briefings",
    "culture",
    "learning",
    "products",
    "communities",
    "social",
    "events",
    "commitments",
  ])
    await context(source);
  await db.exec("reset role");
  await db.query(
    "insert into member_leads values($1,$2,'Profile Alpha','Spark','','','','','',null,'{}','private')",
    [uid(220), uid(3)],
  );
  await asRole(1);
  assert.equal(
    ((await context("hqh", "Profile Alpha")).items as unknown[]).length,
    0,
  );
  for (const n of [5, 6]) {
    await asRole(n);
    assert.equal(
      (await db.query("select * from member_ai_messages")).rows.length,
      0,
    );
    await assert.rejects(context("events"), /Member access required/);
  }
  // Upgrading a learning conversation to business makes it unavailable
  // after a later downgrade; cached business text cannot reach Ember Chat.
  await db.exec("reset role");
  await db.query(
    "update weos_community_memberships set role_code='torch' where person_id=$1",
    [uid(34)],
  );
  await db.query(
    "insert into member_ai_messages(id,user_id,conversation_id,body,role) values($1,$2,$3,'Business follow-up','user')",
    [uid(230), uid(4), uid(211)],
  );
  await db.query(
    "update weos_community_memberships set role_code='ember' where person_id=$1",
    [uid(34)],
  );
  await asRole(4);
  assert.equal(
    (await db.query("select * from member_ai_messages")).rows.length,
    0,
  );
  assert.equal(
    (await db.query("select * from member_ai_conversations")).rows.length,
    0,
  );
  await db.exec("reset role");
  await assert.rejects(
    db.query(
      "insert into member_ai_messages(id,user_id,conversation_id,body,role) values($1,$2,$3,'Attempt to reuse','user')",
      [uid(231), uid(4), uid(211)],
    ),
    /new learning conversation/,
  );
  await db.exec("reset role; set role anon");
  await assert.rejects(context("events"), /permission denied/);
  await assert.rejects(
    db.query("select * from member_ai_messages"),
    /permission denied/,
  );
  await db.close();
});
