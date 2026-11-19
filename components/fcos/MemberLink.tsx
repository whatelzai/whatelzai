"use client";
import NextLink, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

function Pending() {
  const { pending } = useLinkStatus();
  return pending ? (
    <span
      data-fcos-navigation-pending
      role="status"
      className="fcos-navigation-hint"
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 rounded-full bg-yellow-500 motion-safe:animate-pulse"
      />
      <span className="sr-only">Opening page…</span>
    </span>
  ) : null;
}

/** Real router feedback; modifier clicks, interruption and prefetch retain Next semantics. */
export default function MemberLink({
  children,
  className = "",
  ...props
}: ComponentProps<typeof NextLink>) {
  return (
    <NextLink {...props} data-fcos-link className={`relative ${className}`}>
      {children}
      <Pending />
    </NextLink>
  );
}
