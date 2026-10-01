// Service worker minimo (PWA instalavel). Offline completo e Web Push entram nas proximas semanas.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
// self.addEventListener("push", ...)  // TODO semana 3: Web Push (VAPID)
