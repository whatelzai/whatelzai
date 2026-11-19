"use server";
import { adminUrl } from "@/lib/admin-url";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/users";
import {
  upsertServiceEvent,
  deleteServiceEvent,
  type ServiceEvent,
  type ServiceEventKind,
} from "@/lib/service-events";

async function assertAdmin(): Promise<void> {
  await requireAdmin();
}

function afterWrite() {
  revalidatePath("/admin/events");
  revalidatePath("/admin/testimonials");
}

export async function saveEvent(
  fields: Partial<ServiceEvent> & {
    slug: string;
    name: string;
    kind: ServiceEventKind;
  },
) {
  await assertAdmin();
  const saved = await upsertServiceEvent(fields);
  afterWrite();
  if (!fields.id) redirect(adminUrl(`/admin/events/${saved.id}`));
}

export async function removeEvent(id: string) {
  await assertAdmin();
  await deleteServiceEvent(id);
  afterWrite();
  redirect(adminUrl("/admin/events"));
}
