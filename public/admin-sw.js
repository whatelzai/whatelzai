// Admin installation compatibility. No Cache Storage, private offline snapshots,
// queued mutations or background sync: every request still reaches owner auth.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch((error) => {
      if (event.request.mode !== "navigate") throw error;
      return new Response(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reconnect — Whatelz Admin</title><style>body{font:18px/1.6 system-ui,sans-serif;color:#18181b;background:#fff;padding: max(24px,env(safe-area-inset-top)) 24px;max-width:440px;margin:15vh auto}small{background:#ffe458;padding:8px 12px;border-radius:8px}h1{font-size:32px;line-height:1.2}a{display:inline-block;color:#18181b;background:#ffe458;padding:12px 20px;border-radius:12px;font-weight:600}</style></head><body><small>WHATELZ ADMIN</small><h1>You're offline.</h1><p>Reconnect to read your private dashboard. Your briefs and account data aren't stored offline.</p><a href="/today">Try again</a></body></html>`,
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" } },
      );
    }),
  );
});

// Notification text is deliberately generic; private routine content never leaves Admin.
const adminPushPaths = new Set(["/event-checkin","/today", "/today/weekly", "/settings", "/", "/personal", "/ai-business", "/network-marketing", "/day-job"]);
function adminPushUrl(value) {
  try {
    const url = new URL(value || "/today", self.location.origin);
    if (url.origin === self.location.origin && adminPushPaths.has(url.pathname))
      return url.href;
  } catch {}
  return new URL("/today", self.location.origin).href;
}
self.addEventListener("push", (event) => {
  let notice = {};
  try { notice = event.data?.json() || {}; } catch {}
  const titles = new Set(["New event registration confirmed","Your morning brief is ready", "Your evening debrief is ready", "Your weekly closeout is ready", "Whatelz Admin is connected", "Time for Overview", "Time for Personal", "Time for AI Business", "Time for Network Marketing", "Time for Day Job"]);
  event.waitUntil(self.registration.showNotification(titles.has(notice.title) ? notice.title : "Whatelz Admin", {
    body: notice.title === "New event registration confirmed" ? "Open registrations in Whatelz Admin." : typeof notice.title === "string" && titles.has(notice.title) && notice.title.startsWith("Time for ") ? "Open your scheduled space." : "Open Whatelz Admin to read it.",
    icon: "/admin-pwa/icon-192-v2.png",
    badge: "/admin-pwa/icon-192-v2.png",
    tag: typeof notice.tag === "string" ? notice.tag.slice(0, 80) : "whatelz-admin",
    renotify: false,
    data: { url: adminPushUrl(notice.url) },
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = adminPushUrl(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type:"window",includeUncontrolled:true});
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) {
      await existing.navigate(url);
      return existing.focus();
    }
    return self.clients.openWindow(url);
  })());
});
