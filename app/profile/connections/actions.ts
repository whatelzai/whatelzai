"use server";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  beginConnection,
  disconnectAccount,
  saveApp,
  socialOwner,
  syncAccount,
} from "@/lib/social/server";
import {
  providerSchema,
  SOCIAL_COOKIE,
  SOCIAL_ORIGIN,
} from "@/lib/social/model";
async function actor() {
  const owner = await socialOwner();
  const h = await headers();
  if (h.get("origin") !== SOCIAL_ORIGIN)
    throw Error("Open Connections on app.whatelz.ai.");
  return owner;
}
function done(message: string) {
  redirect(`/profile/connections?message=${encodeURIComponent(message)}`);
}
export async function configure(form: FormData) {
  const owner = await actor();
  try {
    await saveApp(owner, providerSchema.parse(form.get("provider")), {
      clientId: form.get("clientId"),
      clientSecret: form.get("clientSecret"),
      readPosts: form.get("readPosts") === "on",
    });
  } catch {
    done(
      "Developer settings could not be saved. Check the fields and try again.",
    );
  }
  done("Developer settings saved securely. You can now connect your account.");
}
export async function connect(form: FormData) {
  const owner = await actor();
  let started;
  try {
    started = await beginConnection(
      owner,
      providerSchema.parse(form.get("provider")),
      Number(form.get("slot")),
      String(form.get("handle") ?? "")
        .replace(/^@/, "")
        .trim(),
    );
  } catch {
    done(
      "Could not start. Check the developer settings and Instagram username.",
    );
  }
  (await cookies()).set(SOCIAL_COOKIE, started!.state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  redirect(started!.url);
}
export async function sync(form: FormData) {
  const owner = await actor();
  let message;
  try {
    message = await syncAccount(owner, z.uuid().parse(form.get("id")));
  } catch {
    message = "Refresh unavailable. Please try again later.";
  }
  done(message);
}
export async function disconnect(form: FormData) {
  const owner = await actor();
  try {
    await disconnectAccount(owner, z.uuid().parse(form.get("id")));
  } catch {
    done("Could not finish disconnecting. Please try again.");
  }
  done("Disconnected. Saved access and cached posts have been removed.");
}
