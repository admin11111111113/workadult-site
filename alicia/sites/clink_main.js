// Внутри окна расширения Lovense (iframe popup.html), MAIN-мир: делаем «Ссылку управления» через его же Vue.
// Команда приходит событием alicia-clink (detail = JSON {min, platform}), ответ — событием alicia-clink-res.
(() => {
  if (window.__aliciaClinkMain) return; window.__aliciaClinkMain = 1;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = e => e && e.offsetParent !== null;
  function F(name) {
    const r = [], el = [...document.querySelectorAll("*")].find(e => e.__vue__); if (!el) return r;
    (function walk(vm, d) { if (!vm || d > 12) return; if ((vm.$options.methods || {})[name]) r.push(vm); (vm.$children || []).forEach(c => walk(c, d + 1)); })(el.__vue__.$root, 0);
    return r;
  }
  const byText = re => [...document.querySelectorAll("button,div,span,a")].filter(e => vis(e) && re.test((e.innerText || "").trim()) && !e.querySelector("button,div,span,a"));
  async function make(min, platform) {
    const v = F("showOrHideGiveSomeControl")[0]; if (!v) return { err: "окно Lovense не готово" };
    v.showOrHideGiveSomeControl(true); await sleep(900);
    let c = F("createControlLink")[0]; if (!c) return { err: "нет блока «Ссылка управления»" };
    const st = c.$store.state.connectStore, before = (st.controlLinkInfo || {}).shortUrl || "";
    if (!byText(/^Установить время контроля$|^Set control time$/i).length) {                 // экран «сеанс завершён» → «Создать новую ссылку»
      const b = byText(/^Создать новую ссылку$|^Create new link$|^Generate new link$/i)[0]; if (b) { b.click(); await sleep(1000); }
      c = F("createControlLink")[0] || c;
    }
    if (byText(/подключите игрушку|connect (a|your) toy/i).length) return { err: "Lovense: игрушка не подключена" };
    c.time = String(min); c.timeUnit = 60; if (platform) c.selectPlatform = platform; await sleep(400);
    const go = byText(/^Создать новую ссылку$|^Create new link$|^Generate( new)? link$/i).pop();
    if (go) go.click(); else c.createControlLink();
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      const u = (st.controlLinkInfo || {}).shortUrl || "";
      if (u && u !== before) return { url: u, min, platform };
      if (c.showPlatformError) return { err: "Lovense: выбери площадку (" + (platform || "?") + " не подошла)" };
    }
    const anyUrl = (document.body.innerText.match(/https?:\/\/c\.lovense\.com\/\S+/) || [])[0];
    return anyUrl ? { url: anyUrl, min, platform } : { err: "Lovense не выдал ссылку за 20 сек" };
  }
  addEventListener("alicia-clink", async e => {
    let d = {}; try { d = JSON.parse(e.detail || "{}"); } catch (x) {}
    let res; try { res = await make(+d.min || 5, d.platform || ""); } catch (x) { res = { err: "ошибка: " + x }; }
    dispatchEvent(new CustomEvent("alicia-clink-res", { detail: JSON.stringify({ ...res, rid: d.rid }) }));
  });
})();
