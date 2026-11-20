// Alicia Helper 1.1 — тонкий исполнитель. Логика (скрипты площадок, Lovense, подсказки) приходит со страницы
// workadult.pro/alicia, поэтому обновлять само расширение не нужно.
// 1.1: скрипты могут идти во все фреймы (allFrames) и в MAIN-мир; очередь команд для скриптов (push/poll по каналу).
const ports = new Set();
const Q = {};                                           // канал → [команды] (panel → скрипты на страницах)
async function usOk() { try { await chrome.userScripts.getScripts(); return true; } catch (e) { return false; } }
(async () => { try { await chrome.userScripts.configureWorld({ messaging: true }); } catch (e) {} })();

async function run(m) {
  switch (m.op) {
    case "ping": return { v: chrome.runtime.getManifest().version, us: await usOk() };
    case "scripts": {                                   // [{id, matches, code, allFrames?, world?}] — ставим/обновляем скрипты площадок
      try { await chrome.userScripts.configureWorld({ messaging: true }); } catch (e) {}
      const old = (await chrome.userScripts.getScripts()).map(s => s.id);
      if (old.length) await chrome.userScripts.unregister({ ids: old });
      await chrome.userScripts.register(m.list.map(s => ({ id: s.id, matches: s.matches, js: [{ code: s.code }],
        world: s.world === "MAIN" ? "MAIN" : "USER_SCRIPT", allFrames: !!s.allFrames, runAt: s.runAt || "document_idle" })));
      if (m.reload) for (const s of m.list) for (const t of await chrome.tabs.query({ url: s.matches })) chrome.tabs.reload(t.id);
      return { ok: true };
    }
    case "reload": {                                    // перезагрузить вкладки, чей адрес начинается с prefix
      const re = m.re ? new RegExp(m.re) : null; let n = 0;
      for (const t of await chrome.tabs.query({})) if (re ? re.test(t.url || "") : (t.url || "").startsWith(m.prefix)) { chrome.tabs.reload(t.id); n++; }
      return { n };
    }
    case "push": (Q[m.ch] = Q[m.ch] || []).push(m.cmd); if (Q[m.ch].length > 20) Q[m.ch].shift(); return { ok: true };
    case "openTab": {
      const tabs = await chrome.tabs.query({}), ex = tabs.find(t => (t.url || "").startsWith(m.prefix || m.url));
      if (ex) { if (m.focus) chrome.tabs.update(ex.id, { active: true }); return { id: ex.id, existed: true }; }
      const t = await chrome.tabs.create({ url: m.url, pinned: !!m.pinned, active: !!m.focus }); return { id: t.id };
    }
    case "exts": return (await chrome.management.getAll()).map(e => ({ id: e.id, name: e.name, enabled: e.enabled, version: e.version }));
    case "enableExt": await chrome.management.setEnabled(m.id, true); return { ok: true };
    case "fetch": {
      const r = await fetch(m.url, { method: m.method || "GET", headers: m.headers || {}, body: m.body, signal: AbortSignal.timeout(m.timeout || 4000) });
      return { status: r.status, text: await r.text() };
    }
    case "get": return (await chrome.storage.local.get(m.key))[m.key] ?? null;
    case "set": await chrome.storage.local.set({ [m.key]: m.val }); return { ok: true };
  }
  return { error: "unknown op " + m.op };
}
chrome.runtime.onConnectExternal.addListener(p => {
  ports.add(p); p.onDisconnect.addListener(() => ports.delete(p));
  p.onMessage.addListener(async m => {
    let res; try { res = await run(m); } catch (e) { res = { error: String(e) }; }
    if (m.rid) try { p.postMessage({ type: "res", rid: m.rid, res }); } catch (e) {}
  });
});
const relay = (m, sender, reply) => {
  if (m && m.type === "poll") { reply(((Q[m.ch] || []).shift()) || null); return; }   // скрипт на странице забирает команду
  for (const p of ports) try { p.postMessage({ ...m, tab: sender?.tab?.id }); } catch (e) {}
};
chrome.runtime.onUserScriptMessage?.addListener(relay);
chrome.runtime.onMessage.addListener(relay);
