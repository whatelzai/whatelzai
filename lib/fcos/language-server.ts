import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { MEMBER_LANGUAGE_COOKIE, memberLanguage, memberText } from "./language";
// Nonsensitive device preference only: no auth/database round trip in the shell.
export const getMemberLanguage = cache(async () =>
  memberLanguage((await cookies()).get(MEMBER_LANGUAGE_COOKIE)?.value),
);
export async function memberTranslator() {
  const language = await getMemberLanguage();
  return { language, t: (text: string) => memberText(language, text) };
}
