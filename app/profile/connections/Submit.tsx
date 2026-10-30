"use client";
import { useFormStatus } from "react-dom";
export function Submit({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="min-h-11 rounded-full bg-zinc-950 px-5 text-sm font-medium text-white disabled:opacity-50"
    >
      {pending ? "Please wait…" : children}
    </button>
  );
}
