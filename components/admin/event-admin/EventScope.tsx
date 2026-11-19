"use client";
import { createContext, useContext } from "react";
import { currentEvent } from "@/lib/public-events/map";
export const EventScope = createContext<string>(currentEvent.id);
export function useEventMediaUrl() {
  const id = useContext(EventScope);
  return `/api/admin/event-media?event=${encodeURIComponent(id)}`;
}
