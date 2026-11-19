"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";

export function AdminSubmit({
  children,
  disabled,
  pendingLabel = "Working…",
  ...props
}: ComponentProps<"button"> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
