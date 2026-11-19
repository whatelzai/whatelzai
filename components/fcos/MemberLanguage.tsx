"use client";
import { createContext, useContext, type ReactNode } from "react";
import { memberText, type MemberLanguage } from "@/lib/fcos/language";
const LanguageContext = createContext<MemberLanguage>("en");
export function MemberLanguageProvider({
  language,
  children,
}: {
  language: MemberLanguage;
  children: ReactNode;
}) {
  return (
    <LanguageContext.Provider value={language}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useMemberLanguage() {
  const language = useContext(LanguageContext);
  return { language, t: (text: string) => memberText(language, text) };
}
