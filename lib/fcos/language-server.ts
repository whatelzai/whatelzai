import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import {
  MEMBER_LANGUAGE_COOKIE,
  memberLanguage,
  memberText,
  needsMemberLanguageChoice,
} from "./language";
// Nonsensitive device preference only: no auth/database round trip in the shell.
export const getMemberLanguagePreference = cache(async () => {
  const value = (await cookies()).get(MEMBER_LANGUAGE_COOKIE)?.value;
  return {
    language: memberLanguage(value),
    needsChoice: needsMemberLanguageChoice(value),
  };
});
export const getMemberLanguage = cache(
  async () => (await getMemberLanguagePreference()).language,
);
export async function memberTranslator() {
  const language = await getMemberLanguage();
  return { language, t: (text: string) => memberText(language, text) };
}
