// Внутри окна Lovense (USER_SCRIPT-мир): забираем команды панели из помощника (канал "lov") и передаём в MAIN-скрипт.
(() => {
  if (window.__aliciaClinkBr) return; window.__aliciaClinkBr = 1;
  const send = m => { try { return chrome.runtime.sendMessage(m); } catch (e) { return Promise.resolve(null); } };
  addEventListener("alicia-clink-res", e => { let r = {}; try { r = JSON.parse(e.detail || "{}"); } catch (x) {} send({ type: "clinkres", ...r }); });
  setInterval(async () => {
    const cmd = await send({ type: "poll", ch: "lov" });
    if (cmd && cmd.type === "clink") dispatchEvent(new CustomEvent("alicia-clink", { detail: JSON.stringify(cmd) }));
  }, 1000);
  send({ type: "lovready" });
})();
