import { z } from "zod";
import { dailyOwner } from "@/lib/daily/server";
import { adminChatOriginAllowed } from "@/lib/admin-chat/model";
import { cachedRhythms, markRhythmRead } from "@/lib/admin-rhythm/server";
import { rhythmKinds } from "@/lib/admin-rhythm/model";
const json = (v: unknown, s = 200) =>
  Response.json(v, {
    status: s,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET() {
  let owner;
  try {
    owner = await dailyOwner();
  } catch {
    return json({ error: "Owner sign-in required" }, 403);
  }
  try {
    const snapshots = await cachedRhythms(owner);
    return json({
      snapshots: snapshots.map(
        ({ kind, entry_key, version, read_version }) => ({
          kind,
          entry_key,
          version,
          read_version,
        }),
      ),
    });
  } catch {
    return json({ error: "Briefings could not be read" }, 503);
  }
}
export async function POST(request: Request) {
  if (!adminChatOriginAllowed(request, process.env.NODE_ENV === "development"))
    return json({ error: "Invalid origin" }, 403);
  let owner;
  try {
    owner = await dailyOwner();
  } catch {
    return json({ error: "Owner sign-in required" }, 403);
  }
  const p = z
    .object({
      kind: z.enum(rhythmKinds),
      version: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict()
    .safeParse(await request.json().catch(() => null));
  if (!p.success) return json({ error: "Invalid briefing" }, 400);
  try {
    await markRhythmRead(owner, p.data.kind, p.data.version);
    return json({ ok: true });
  } catch {
    return json({ error: "Read status could not be saved" }, 503);
  }
}
