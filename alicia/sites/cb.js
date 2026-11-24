// Chaturbate (страница эфира /b/…): донаты, покупки по меню Dream Bot и сообщения комнаты.
// Разметка чата (22.11, видно зрителем): div[data-testid=chat-message][data-nick] → [data-testid=username-label] (класс = токены:
// hasTokens / tippedRecently / tippedALotRecently / tippedTonsRecently), донат — [data-testid=room-notice].isTip «ник tipped 38 tokens»,
// пункт меню — строка Dream Bot «Notice: ник tipped for → Play with nipples 🍒» (без суммы).
(() => {
  if (window.__aliciaCB) return; window.__aliciaCB = 1;
  const seen = new WeakSet(), t0 = Date.now(), send = m => { try { chrome.runtime.sendMessage(m); } catch (e) {} };
  const ME = /^_?skitlstrynka_?$/i;
  const TIP = /(\S+)\s+tipped\s+(\d+)\s+tokens?(?:\s*--\s*(.+))?/i, MENUBUY = /(?:^|Notice:\s*)(\S+)\s+tipped for\s*(?:→|->)\s*(.+)$/i;
  const lvlOf = u => { const c = (u && u.className) || ""; return /tons/i.test(c) ? 4 : /alot/i.test(c) ? 3 : /tipped/i.test(c) ? 2 : /hastokens/i.test(c) ? 1 : 0; };
  function line(e) {
    if (seen.has(e)) return; seen.add(e);
    const t = (e.innerText || "").replace(/\s+/g, " ").trim(); if (!t || t.length > 500) return;
    const nt = e.querySelector("[data-testid=room-notice]");
    let k = MENUBUY.exec(t);
    if (k) return send({ type: "menubuy", p: "cb", who: k[1], what: k[2].replace(/[^\p{L}\p{N} '’&+-]/gu, "").trim() });
    if (nt && /isTip/.test(nt.className) && (k = TIP.exec(t))) return send({ type: "tip", p: "cb", who: k[1], tk: +k[2], what: (k[3] || "").trim() });
    const nick = e.dataset.nick, u = e.querySelector("[data-testid=username-label]");
    if (!nick || nt) return;
    let text = t; if (text.toLowerCase().startsWith(nick.toLowerCase())) text = text.slice(nick.length).replace(/^[:\s]+/, "");
    if (!text) return;
    send({ type: "chat", p: "cb", who: nick, text: text.slice(0, 300), lvl: lvlOf(u), me: ME.test(nick) });
  }
  // 24.11: у неё СТАРЫЙ вид страницы эфира (вкладки «ЧАТ / MESSAGES / ПОЛЬЗОВАТЕЛИ», строки «ник tipped 1 token -- текст», «ник: текст»),
  // там нет data-testid → ничего не шло в панель (gooshy0211). Берём новые строки чата по тексту, только внутри блока чата.
  const SYS = /^(пользователь|user|notice|новое описание|room subject|new room subject|уведомлен)/i;
  function classic(n) {
    if (seen.has(n) || !n.closest || n.closest("[data-testid=chat-message]")) return;
    const box = n.closest("[class*=chat i],[id*=chat i]"); if (!box || n.querySelector("input,textarea,button")) return;
    seen.add(n);
    const t = (n.innerText || "").replace(/\s+/g, " ").trim(); if (!t || t.length > 500 || SYS.test(t)) return;
    let k = MENUBUY.exec(t);
    if (k) return send({ type: "menubuy", p: "cb", who: k[1], what: k[2].replace(/[^\p{L}\p{N} '’&+-]/gu, "").trim() });
    if ((k = /^(\S+)\s+tipped\s+(\d+)\s+tokens?(?:\s*--\s*(.+))?$/i.exec(t))) return send({ type: "tip", p: "cb", who: k[1], tk: +k[2], what: (k[3] || "").trim() });
    if ((k = /^([\w.\-]{2,40})\s*:\s*(.+)$/.exec(t))) send({ type: "chat", p: "cb", who: k[1], text: k[2].slice(0, 300), lvl: 0, me: ME.test(k[1]) });
  }
  new MutationObserver(ms => {
    if (Date.now() - t0 < 5000) return;                                // старое при загрузке не шлём
    for (const m of ms) for (const n of m.addedNodes) {
      if (n.nodeType !== 1) continue;
      const list = n.matches && n.matches("[data-testid=chat-message]") ? [n] : n.querySelectorAll ? n.querySelectorAll("[data-testid=chat-message]") : [];
      for (const e of list) line(e);
      if (!list.length) classic(n);
    }
  }).observe(document.body, { childList: true, subtree: true });
  send({ type: "login", p: "cb", ok: !/login|auth/.test(location.pathname) });
  // видит ли Chaturbate эфир: room_status offline / public / private / away …
  const room = (location.pathname.match(/^\/b\/([^/]+)/) || [])[1] || "_skitlstrynka_";
  let PV = null;                                                     // приват: room_status = private / group (22.11)
  async function live() {
    try { const d = await (await fetch(`/api/chatvideocontext/${room}/`, { credentials: "include" })).json();
      send({ type: "live", p: "cb", on: !!d.room_status && d.room_status !== "offline", st: d.room_status || "" });
      const pv = /private|group/i.test(d.room_status || ""); if (pv !== PV) { PV = pv; send({ type: "private", p: "cb", on: pv }); } } catch (e) {}
  }
  live(); setInterval(live, 5000);
})();
