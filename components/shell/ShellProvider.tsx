"use client";

import { type CSSProperties, type ReactNode } from "react";
import identity from "@/public/brand/identity.json";
import { AppHeader } from "./AppHeader";
import { SiteFooter } from "./SiteFooter";
import { DeviceTracker } from "./DeviceTracker";
import { AppInstallationProvider } from "@/components/fcos/AppInstallation";
import { usePathname } from "next/navigation";

const weosPalette = {
  "--weos-yellow": identity.colors.yellow,
  "--weos-ink": identity.colors.ink,
  "--weos-paper": identity.colors.paper,
} as CSSProperties;

interface Props {
  isAdmin: boolean;
  ownerName: string;
  surface?: "public" | "admin" | "app";
  children: ReactNode;
}

export function ShellProvider({
  isAdmin,
  ownerName,
  children,
  surface = "public",
}: Props) {
  const path = usePathname();
  const isPublic = surface === "public" && !path.startsWith("/admin");
  return (
    <>
      {isPublic && <AppHeader />}
      <div
        id="site-content"
        tabIndex={-1}
        className={
          isPublic
            ? "public-site"
            : surface === "app"
              ? "admin-theme weos-theme"
              : "admin-theme"
        }
        style={surface === "app" ? weosPalette : undefined}
      >
        {surface === "app" ? (
          <AppInstallationProvider>{children}</AppInstallationProvider>
        ) : surface === "admin" ? (
          <AppInstallationProvider name="Admin" worker="/admin-sw.js">
            {children}
          </AppInstallationProvider>
        ) : (
          children
        )}
      </div>
      {isPublic && <SiteFooter ownerName={ownerName} />}
      {isPublic && !isAdmin && <DeviceTracker />}
    </>
  );
}
