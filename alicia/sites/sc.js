// Stripchat: донаты и сообщения комнаты из API чата модели (под её входом). Приходит с сайта, расширение не трогаем.
(() => {
  if (window.__aliciaSC) return; window.__aliciaSC = 1;
  const UID = "193919081", seen = new Set(); let boot = true;
  const send = m => chrome.runtime.sendMessage(m);
  async function tick() {
    try {
      const r = await fetch(`/api/front/v2/models/${UID}/chat`, { credentials: "include" });
      if (r.status === 401 || r.status === 403) { send({ type: "login", p: "sc", ok: false }); return; }
      const d = await r.json(); send({ type: "login", p: "sc", ok: true });
      for (const x of d.messages || []) {
        const who = (x.userData || {}).username || "", dd = x.details || {}, id = x.id || x.createdAt + who;
        if (seen.has(id)) continue; seen.add(id); if (boot) continue;
        if (x.type === "tip") send({ type: "tip", p: "sc", who, tk: +dd.amount || 0, what: (dd.body || "").trim(), src: dd.source || "" });
        else if (x.type === "text" && who) send({ type: "chat", p: "sc", who, text: (dd.body || "").trim() });
      }
      boot = false;
    } catch (e) {}
  }
  tick(); setInterval(tick, 4000);
})();
