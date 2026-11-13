"use client";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Copy, X } from "lucide-react";
import { adminDestination, adminParent } from "@/lib/admin-link-policy";
import { adminUrl } from "@/lib/admin-url";
import { cleanAdminPath } from "@/lib/admin-navigation";
import Link from "./AdminLink";
import { useAdminFocus } from "./AdminFocus";
import { AdminText } from "./AdminPreferences";

export function AdminAppBoundary() {
  const router = useRouter();
  const pathname = usePathname();
  const focus = useAdminFocus();
  const [navigating, startNavigation] = useTransition();
  const navigate = useEffectEvent((href: string) => {
    focus?.manualPath(new URL(href, location.origin).pathname);
    startNavigation(() => router.push(href));
  });
  const [preview, setPreview] = useState<{
    kind: "file" | "external";
    url: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const popup = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (preview) popup.current?.showModal();
  }, [preview]);
  useEffect(() => {
    const originalUrl = location.href;
    if (!history.state?.__adminBoundaryInstalled) {
      history.replaceState(
        {
          ...history.state,
          __adminBoundaryInstalled: true,
          __adminBoundaryBase: true,
        },
        "",
        originalUrl,
      );
      history.pushState(
        { ...history.state, __adminBoundaryBase: false },
        "",
        originalUrl,
      );
    }
    const layers: Array<{
      dialog: HTMLElement;
      token: string;
      popped: boolean;
      url: string;
    }> = [];
    let internalPop = false,
      disposed = false;
    let pendingNavigation: string | null = null;
    function finishNavigation() {
      if (!layers.length && pendingNavigation) {
        const href = pendingNavigation;
        pendingNavigation = null;
        navigate(href);
      }
    }
    function sync() {
      if (disposed) return;
      const dialogs = Array.from(
        document.querySelectorAll<HTMLElement>(
          '.admin-workspace-shell dialog[open], .admin-workspace-shell .admin-space-switcher[open], .admin-workspace-shell [data-admin-overlay="open"]',
        ),
      );
      for (let i = layers.length - 1; i >= 0; i--) {
        const layer = layers[i];
        if (!dialogs.includes(layer.dialog)) {
          layers.splice(i, 1);
          if (
            !layer.popped &&
            history.state?.__adminOverlay === layer.token &&
            location.href === layer.url
          ) {
            internalPop = true;
            history.back();
            return;
          }
        }
      }
      for (const dialog of dialogs) {
        if (layers.some((l) => l.dialog === dialog)) continue;
        const token = crypto.randomUUID();
        layers.push({ dialog, token, popped: false, url: location.href });
        history.pushState(
          {
            ...history.state,
            __adminOverlay: token,
            __adminBoundaryBase: false,
          },
          "",
          location.href,
        );
      }
    }
    const isOpen = (el: HTMLElement) =>
      el.hasAttribute("open") || el.dataset.adminOverlay === "open";
    function closeNative(el: HTMLElement) {
      if (el instanceof HTMLDialogElement) el.close();
      else el.removeAttribute("open");
    }
    function closeForNavigation() {
      if (internalPop) return;
      const layer = layers.at(-1);
      if (!layer) {
        finishNavigation();
        return;
      }
      const cancelled = !layer.dialog.dispatchEvent(
        new Event("cancel", { cancelable: true }),
      );
      if (!cancelled) closeNative(layer.dialog);
      requestAnimationFrame(() => {
        if (disposed) return;
        if (isOpen(layer.dialog)) {
          pendingNavigation = null;
          return;
        }
        sync();
        if (!internalPop) closeForNavigation();
      });
    }
    function pop() {
      if (internalPop) {
        internalPop = false;
        sync();
        if (pendingNavigation) closeForNavigation();
        return;
      }
      const layer = layers.at(-1);
      if (layer && isOpen(layer.dialog)) {
        layer.popped = true;
        const cancelled = !layer.dialog.dispatchEvent(
          new Event("cancel", { cancelable: true }),
        );
        if (!cancelled) closeNative(layer.dialog);
        requestAnimationFrame(() => {
          if (disposed) return;
          if (isOpen(layer.dialog) && layer.dialog.isConnected) {
            layer.popped = false;
            history.pushState(
              {
                ...history.state,
                __adminOverlay: layer.token,
                __adminBoundaryBase: false,
              },
              "",
              layer.url,
            );
          }
          sync();
        });
        return;
      }
      if (history.state?.__adminBoundaryBase) {
        history.pushState(
          { ...history.state, __adminBoundaryBase: false },
          "",
          location.href,
        );
        const p = cleanAdminPath(location.pathname);
        if (p !== "/") router.replace(adminUrl(adminParent(location.pathname)));
      }
    }
    function click(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const anchor = (
        e.target instanceof Element ? e.target.closest("a[href]") : null
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        !anchor.closest(".admin-workspace-shell") ||
        anchor.hasAttribute("download")
      )
        return;
      const destination = adminDestination(
        anchor.href,
        location.origin,
        location.pathname,
      );
      if (destination.kind === "navigate") {
        const target = new URL(destination.href, location.origin);
        if (
          target.pathname === location.pathname &&
          target.search === location.search &&
          target.hash
        )
          return;
        if (
          layers.length &&
          (target.pathname !== location.pathname ||
            target.search !== location.search ||
            target.hash)
        ) {
          e.preventDefault();
          e.stopPropagation();
          pendingNavigation = destination.href;
          closeForNavigation();
          return;
        }
        // Intercept only rewritten destinations and new-window links; normal Next links retain prefetch/pending feedback.
        if (target.href !== anchor.href || anchor.target === "_blank") {
          e.preventDefault();
          e.stopPropagation();
          navigate(destination.href);
        }
      } else if (
        destination.kind === "file" ||
        destination.kind === "external"
      ) {
        e.preventDefault();
        e.stopPropagation();
        setCopied(false);
        setPreview(destination);
      }
    }
    function submit(e: SubmitEvent) {
      if (
        e.target instanceof Element &&
        e.target.closest(".admin-site-preview")
      ) {
        e.preventDefault();
        e.stopPropagation();
        setPreview({
          kind: "external",
          url: "Public forms are read-only in Admin preview.",
        });
      }
    }
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open", "data-admin-overlay"],
    });
    sync();
    window.addEventListener("popstate", pop);
    document.addEventListener("click", click, true);
    document.addEventListener("submit", submit, true);
    return () => {
      disposed = true;
      observer.disconnect();
      window.removeEventListener("popstate", pop);
      document.removeEventListener("click", click, true);
      document.removeEventListener("submit", submit, true);
    };
  }, [router]);
  const top = ["/", "/personal", "/settings"].includes(
    cleanAdminPath(pathname),
  );
  return (
    <>
      {navigating && (
        <div className="admin-navigation-pending" role="status">
          <span className="admin-loading-dot" aria-hidden="true" />
          Opening page…
        </div>
      )}
      {!top && (
        <div className="admin-back-row">
          <Link href={adminUrl(adminParent(pathname))}>
            <ArrowLeft size={17} aria-hidden="true" />
            <AdminText text="Back" />
          </Link>
        </div>
      )}
      {preview && (
        <dialog
          ref={popup}
          className="admin-contained-preview"
          onCancel={(e) => {
            e.preventDefault();
            setPreview(null);
          }}
        >
          <header>
            <h2>
              {preview.kind === "file" ? "File preview" : "External service"}
            </h2>
            <button
              type="button"
              aria-label="Close preview"
              onClick={() => setPreview(null)}
            >
              <X size={20} />
            </button>
          </header>
          {preview.kind === "file" ? (
            <iframe
              title="File preview"
              src={preview.url}
              sandbox=""
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="admin-external-note">
              <p>
                This service runs outside Admin. Its address is available to
                copy; this action stays in the app.
              </p>
              <p className="break-all">{preview.url}</p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(preview.url);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                <Copy size={16} />
                {copied ? "Copied" : "Copy address"}
              </button>
            </div>
          )}
        </dialog>
      )}
    </>
  );
}
