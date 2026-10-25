"use client";
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
const server = () => false;
export function usePasskeySupport(kind: "create" | "get") {
  return useSyncExternalStore(
    subscribe,
    () =>
      window.isSecureContext &&
      "PublicKeyCredential" in window &&
      typeof PublicKeyCredential.prototype.toJSON === "function" &&
      typeof (kind === "create"
        ? PublicKeyCredential.parseCreationOptionsFromJSON
        : PublicKeyCredential.parseRequestOptionsFromJSON) === "function",
    server,
  );
}
