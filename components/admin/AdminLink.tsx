"use client";
import { useAdminFocus } from "./AdminFocus";

import NextLink, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

/** Uses the router's real pending state, including interruption and completion. */
export default function AdminLink({
  children,
  onNavigate,
  ...props
}: ComponentProps<typeof NextLink>) {
  const focus = useAdminFocus();
  return (
    <NextLink
      {...props}
      data-admin-link=""
      onNavigate={(event) => {
        let cancelled = false;
        onNavigate?.({
          preventDefault: () => {
            cancelled = true;
            event.preventDefault();
          },
        });
        if (!cancelled) {
          const href =
            typeof props.href === "string" ? props.href : props.href.pathname;
          if (href) {
            try {
              const target = new URL(href, location.href);
              if (target.origin === location.origin)
                focus?.manualPath(target.pathname);
            } catch {
              /* Leave URL validation to Next Link. */
            }
          }
        }
      }}
    >
      {children}
      <NavigationFeedback />
    </NextLink>
  );
}

function NavigationFeedback() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      data-navigation-pending=""
      role="status"
      className="admin-navigation-pending"
    >
      <span aria-hidden="true" className="admin-loading-dot" />
      Opening page…
    </span>
  );
}
