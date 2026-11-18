"use client";
import { createContext, useContext } from "react";
import type { WeosRole } from "@/lib/weos-roles";
const Context = createContext<WeosRole>("guest");
export function WeosRoleProvider({
  role,
  children,
}: {
  role: WeosRole;
  children: React.ReactNode;
}) {
  return <Context.Provider value={role}>{children}</Context.Provider>;
}
export const useWeosRole = () => useContext(Context);
