// Stripchat: донаты и сообщения комнаты из API чата модели (под её входом). Приходит с сайта, расширение не трогаем.
(() => {
  if (window.__aliciaSC) return; window.__aliciaSC = 1;
  const UID = "KATE_SC_UID", seen = new Set(); let boot = true;
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
        else if (x.type === "text" && who) { const u = x.userData || {}, lg = ((u.userRanking || {}).league || "").toLowerCase();
          const lvl = u.isUltimate ? 3 : u.isGreen ? (/gold|diamond|royal|legend/.test(lg) ? 2 : 1) : 0;     // зелёный ник = есть токены
          send({ type: "chat", p: "sc", who, uid: String(u.id || ""), lvl, me: !!u.isModel, text: (dd.body || "").trim() }); }
      }
      boot = false;
    } catch (e) {}
  }
  tick(); setInterval(tick, 4000);
  // видит ли Stripchat эфир (status: off / public / private / p2p …)
  let PV = null;                                                     // приват: status = private / p2p / groupShow (22.11)
  async function live() {
    try { const d = await (await fetch(`/api/front/v2/models/${UID}/cam`, { credentials: "include" })).json(), u = d.user || d.cam || d;
      const st = (JSON.stringify(d).match(/"status":"([^"]+)"/) || [])[1] || "", on = /"isLive":true/.test(JSON.stringify(d)) || (st && st !== "off");
      send({ type: "live", p: "sc", on, st });
      const pv = /priv|p2p|group|exclusive|spy/i.test(st); if (pv !== PV) { PV = pv; send({ type: "private", p: "sc", on: pv }); } } catch (e) {}
  }
  live(); setInterval(live, 5000);
})();
