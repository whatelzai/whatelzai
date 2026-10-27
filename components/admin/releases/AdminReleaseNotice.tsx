"use client";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  releaseHome,
  releaseReceiptKey,
  type AdminRelease,
} from "@/lib/admin-releases/model";
const Popup = dynamic(() => import("./AdminReleasePopup"), { ssr: false });
const changed = "whatelz-admin-release-seen";
const memory = new Map<string, string>();
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(changed, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(changed, cb);
  };
}
function read(key: string) {
  try {
    return memory.get(key) ?? localStorage.getItem(key) ?? "";
  } catch {
    return memory.get(key) ?? "";
  }
}
export default function AdminReleaseNotice({
  owner,
  releases,
}: {
  owner: string;
  releases: AdminRelease[];
}) {
  const path = usePathname();
  const latest = releases[0]?.id ?? "";
  const key = releaseReceiptKey(owner);
  const seen = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => latest,
  );
  if (!latest || !releaseHome(path) || seen === latest) return null;
  return (
    <Popup
      releases={releases.slice(0, 3)}
      onDismiss={() => {
        memory.set(key, latest);
        try {
          localStorage.setItem(key, latest);
        } catch {
          /* Closing still works without browser storage. */
        }
        window.dispatchEvent(new Event(changed));
      }}
    />
  );
}
