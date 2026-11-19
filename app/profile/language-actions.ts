"use server";
import { cookies } from "next/headers";
import { requireAssignedUser } from "@/lib/app-access";
import { isMemberLanguage, MEMBER_LANGUAGE_COOKIE } from "@/lib/fcos/language";
export async function saveMemberLanguage(
  _previous: { error: string },
  form: FormData,
) {
  await requireAssignedUser();
  const language = form.get("language");
  if (!isMemberLanguage(language))
    return { error: "Choose English or 简体中文." };
  try {
    (await cookies()).set(MEMBER_LANGUAGE_COOKIE, language, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 31536000,
    });
    return { error: "" };
  } catch {
    return { error: "Couldn’t save your language. Try again." };
  }
}
