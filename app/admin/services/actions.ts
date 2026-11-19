"use server";
import { adminUrl } from "@/lib/admin-url";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/users";
import { deleteService, upsertService, type Service } from "@/lib/services";

async function assertAdmin(): Promise<string> {
  await requireAdmin();
  const { userId } = await auth();
  if (!userId) throw new Error("Not signed in");
  return userId;
}

function afterWrite() {
  revalidatePath("/services");
  revalidatePath("/services/[slug]", "page");
  revalidatePath("/admin/services");
}

export async function saveService(
  fields: Partial<Service> & { slug: string; name: string; category: string },
) {
  await assertAdmin();
  await upsertService(fields);
  afterWrite();
}

export async function removeService(id: string) {
  await assertAdmin();
  await deleteService(id);
  afterWrite();
  redirect(adminUrl("/admin/services"));
}
