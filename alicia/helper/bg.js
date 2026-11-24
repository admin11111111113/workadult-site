// Alicia Helper 2.0 — ставится ОДИН раз. Сам ничего не решает: вся логика приходит со страницы workadult.pro/alicia,
// поэтому новые функции добавляются на сайте, а расширение переустанавливать не нужно.
// 2.0 (24.11): общий вызов любого chrome.* (op "api"), выполнить код во вкладке (op "exec"), сведения о ПК (CPU/память),
// не давать ПК уснуть в эфире, системные уведомления, сторож: панель всегда открыта (закреплённая вкладка) — значит
// обновления с сайта доходят всегда, даже если она случайно закрыла панель или перезапустила Chrome.
const PANEL = "https://workadult.pro/alicia/?pin=1";
const ports = new Set();
const Q = {};                                           // канал → [команды] (панель → скрипты на страницах)
async function usOk() { try { await chrome.userScripts.getScripts(); return true; } catch (e) { return false; } }
(async () => { try { await chrome.userScripts.configureWorld({ messaging: true }); } catch (e) {} })();

// любой chrome.* по пути: "tabs.query", "windows.update", "system.cpu.getInfo" …
function fnAt(path) {
  const parts = String(path || "").split("."); let o = chrome, self = chrome;
  for (const k of parts) { if (o == null) break; self = o; o = o[k]; }
  if (typeof o !== "function") throw new Error("нет такого вызова: chrome." + path);
  return o.bind(self);
}
let cpuPrev = null;
async function cpuLoad() {                              // загрузка процессора её ПК, % (между двумя замерами)
  const i = await chrome.system.cpu.getInfo(); let u = 0, t = 0;
  for (const p of i.processors) { u += p.usage.user + p.usage.kernel; t += p.usage.total; }
  const r = cpuPrev && t > cpuPrev.t ? Math.round(100 * (u - cpuPrev.u) / (t - cpuPrev.t)) : null; cpuPrev = { u, t }; return r;
}

async function run(m) {
  switch (m.op) {
    case "ping": return { v: chrome.runtime.getManifest().version, us: await usOk(), caps: ["api", "exec", "sys", "awake", "note", "watchdog"] };
    case "scripts": {                                   // [{id, matches, code, allFrames?, world?, runAt?}] — ставим/обновляем скрипты площадок
      try { await chrome.userScripts.configureWorld({ messaging: true }); } catch (e) {}
      const old = (await chrome.userScripts.getScripts()).map(s => s.id);
      if (old.length) await chrome.userScripts.unregister({ ids: old });
      await chrome.userScripts.register(m.list.map(s => ({ id: s.id, matches: s.matches, js: [{ code: s.code }],
        world: s.world === "MAIN" ? "MAIN" : "USER_SCRIPT", allFrames: !!s.allFrames, runAt: s.runAt || "document_idle" })));
      if (m.reload) for (const s of m.list) for (const t of await chrome.tabs.query({ url: s.matches })) chrome.tabs.reload(t.id);
      return { ok: true };
    }
    case "reload": {                                    // перезагрузить вкладки, чей адрес начинается с prefix (или подходит под re)
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
    // ── 2.0 ──
    case "api": return await fnAt(m.fn)(...(m.args || []));                     // любой chrome.* — новые функции без переустановки
    case "exec": {                                      // выполнить код во вкладках (по адресу/регулярке/ид), вернуть результат
      const re = m.re ? new RegExp(m.re) : null;
      const tabs = m.tab ? [{ id: m.tab }] : (await chrome.tabs.query({})).filter(t => re ? re.test(t.url || "") : (t.url || "").startsWith(m.prefix || "\u0000"));
      const out = [];
      for (const t of tabs) {
        try { const r = await chrome.userScripts.execute({ target: { tabId: t.id, allFrames: !!m.allFrames }, world: m.world === "MAIN" ? "MAIN" : "USER_SCRIPT", js: [{ code: m.code }] });
          out.push({ tab: t.id, url: t.url, res: r.map(x => x.result) }); }
        catch (e) { out.push({ tab: t.id, url: t.url, err: String(e) }); }
      }
      return out;
    }
    case "sys": {                                       // её ПК: CPU %, память, видео-эфир тормозит из-за ПК или из-за интернета
      const mem = await chrome.system.memory.getInfo(), cpu = await chrome.system.cpu.getInfo();
      return { cpu: await cpuLoad(), cores: cpu.numOfProcessors, model: cpu.modelName, memFreeMB: Math.round(mem.availableCapacity / 1048576), memMB: Math.round(mem.capacity / 1048576) };
    }
    case "awake": if (m.on) chrome.power.requestKeepAwake("display"); else chrome.power.releaseKeepAwake(); return { ok: true };
    case "note": {                                      // системное уведомление Windows (видно поверх всех окон, даже если Chrome свёрнут)
      const id = await chrome.notifications.create(m.id || "", { type: "basic", iconUrl: "icon.png", title: m.title || "Алисия", message: m.text || "", priority: 2, requireInteraction: !!m.sticky });
      return { id };
    }
    case "selfReload": setTimeout(() => chrome.runtime.reload(), 300); return { ok: true };
  }
  return { error: "unknown op " + m.op };
}
chrome.runtime.onConnectExternal.addListener(p => {
  if (!/^https:\/\/workadult\.pro\/alicia\//.test((p.sender && p.sender.url) || "") && !/^http:\/\/(127\.0\.0\.1|localhost)[:/]/.test((p.sender && p.sender.url) || "")) { p.disconnect(); return; }   // только её панель
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
chrome.notifications.onClicked.addListener(async () => {      // нажала на уведомление → панель на передний план
  const [t] = await chrome.tabs.query({ url: "https://workadult.pro/alicia/*" });
  if (t) { chrome.tabs.update(t.id, { active: true }); chrome.windows.update(t.windowId, { focused: true }); }
});

// ── сторож: раз в минуту — панель должна быть открыта (закреплённая вкладка). Нет — открываем сами, в фоне.
async function watchdog() {
  const tabs = await chrome.tabs.query({ url: "https://workadult.pro/alicia/*" });
  if (!tabs.length) { const w = await chrome.windows.getAll({ windowTypes: ["normal"] }); if (w.length) chrome.tabs.create({ url: PANEL, pinned: true, active: false, windowId: w[0].id }); }
  else for (const t of tabs) if (t.discarded) chrome.tabs.reload(t.id);             // Chrome «усыпил» вкладку панели — будим
}
chrome.alarms.create("watchdog", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(a => { if (a.name === "watchdog") watchdog().catch(() => {}); });
chrome.runtime.onStartup.addListener(() => setTimeout(() => watchdog().catch(() => {}), 5000));
chrome.runtime.onInstalled.addListener(() => setTimeout(() => watchdog().catch(() => {}), 2000));
chrome.tabs.onRemoved.addListener(() => setTimeout(() => watchdog().catch(() => {}), 3000));      // закрыла панель — через 3 сек снова тут
chrome.windows.onCreated.addListener(() => setTimeout(() => watchdog().catch(() => {}), 3000));   // Chrome открыли заново
setTimeout(() => watchdog().catch(() => {}), 4000);
