// Chaturbate (страница эфира /b/…): строки «ник tipped N tokens» и сообщения комнаты.
(() => {
  if (window.__aliciaCB) return; window.__aliciaCB = 1;
  const seen = new Set(), t0 = Date.now(), send = m => chrome.runtime.sendMessage(m);
  const TIP = /(\S+)\s+tipped\s+(\d+)\s+tokens?(?:\s*--\s*(.+))?/i;
  new MutationObserver(ms => {
    if (Date.now() - t0 < 5000) return;
    for (const m of ms) for (const n of m.addedNodes) {
      const t = (n.innerText || n.textContent || "").trim(); if (!t || t.length > 400 || seen.has(t)) continue;
      const k = TIP.exec(t);
      if (k) { seen.add(t); send({ type: "tip", p: "cb", who: k[1], tk: +k[2], what: (k[3] || "").trim() }); continue; }
      const c = /^([\w-]{3,30}):\s+(.{1,300})$/.exec(t);
      if (c && n.closest && n.closest("[id*=chat],[class*=chat],[class*=Chat]")) { seen.add(t); send({ type: "chat", p: "cb", who: c[1], text: c[2] }); }
    }
    if (seen.size > 2000) seen.clear();
  }).observe(document.body, { childList: true, subtree: true });
  send({ type: "login", p: "cb", ok: !/login|auth/.test(location.pathname) });
  // видит ли Chaturbate эфир: room_status offline / public / private / away …
  const room = (location.pathname.match(/^\/b\/([^/]+)/) || [])[1] || "_skitlstrynka_";
  async function live() {
    try { const d = await (await fetch(`/api/chatvideocontext/${room}/`, { credentials: "include" })).json();
      send({ type: "live", p: "cb", on: !!d.room_status && d.room_status !== "offline", st: d.room_status || "" }); } catch (e) {}
  }
  live(); setInterval(live, 10000);
})();
