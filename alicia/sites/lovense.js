// Lovense Cam Extension (rugextension.lovense.com): сами добавляем 4 сайта при каждом эфире,
// читаем статус игрушек и отдаём всё в панель workadult.pro/alicia.
(() => {
  if (window.__aliciaLV) return; window.__aliciaLV = 1;
  const NEED = ["Chaturbate", "Stripchat", "BongaCams", "ManyVids"];
  const send = m => { try { chrome.runtime.sendMessage(m); } catch (e) {} };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = e => e && e.offsetParent !== null;
  const txt = e => (e.innerText || "").trim();
  const fresh = /[?&]alicia=/.test(location.search);

  // старые вкладки Lovense закрываем, когда панель открыла свежую
  if (fresh) localStorage.aliciaTab = Date.now() + "";
  else window.addEventListener("storage", e => { if (e.key === "aliciaTab") window.close(); });

  function mySites() {
    const t = document.body.innerText || "", i = t.search(/Мои Вебкам-сайты|My Cam Sites|My Webcam Sites/i);
    if (i < 0) return null;
    const part = t.slice(i, i + 600), n = +((/\((\d+)\)/.exec(part) || [])[1] || 0);
    return { n, have: NEED.filter(s => new RegExp(s, "i").test(part.slice(part.indexOf(")") + 1))) };
  }
  function toys() {
    const out = [];
    for (const sw of document.querySelectorAll(".el-switch")) {
      if (!vis(sw)) continue;
      let row = sw.parentElement; for (let k = 0; k < 4 && row && txt(row).length < 3; k++) row = row.parentElement;
      const name = (txt(row || sw).split("\n")[0] || "").trim();
      if (name && name.length < 40) out.push({ name, on: sw.classList.contains("is-checked") });
    }
    return out;
  }
  function byText(sel, re) { return [...document.querySelectorAll(sel)].find(e => vis(e) && re.test(txt(e))); }
  async function waitFor(fn, ms = 8000) { const t = Date.now(); while (Date.now() - t < ms) { const x = fn(); if (x) return x; await sleep(300); } return null; }
  function type(inp, v) {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    inp.focus(); set.call(inp, v); inp.dispatchEvent(new Event("input", { bubbles: true })); inp.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  }

  async function addOne(name) {
    const add = byText("button,a,div,span", /^\+?\s*Добавить сайт с камерами$|^\+?\s*Add (cam|webcam) site/i);
    if (!add) return "нет кнопки «Добавить сайт»";
    add.click();
    const inp = await waitFor(() => [...document.querySelectorAll("input")].find(i => vis(i) && /Начните вводить|Start typing|search/i.test(i.placeholder || "")));
    if (!inp) return "не открылось окно";
    inp.click(); type(inp, name); await sleep(800);
    const item = await waitFor(() => [...document.querySelectorAll("li,.el-select-dropdown__item,[role=option]")].find(e => vis(e) && txt(e).toLowerCase() === name.toLowerCase()));
    if (!item) return "нет " + name + " в списке";
    item.click(); await sleep(600);
    const dlg = inp.closest(".el-dialog,[role=dialog]") || document;
    const ok = [...dlg.querySelectorAll("button")].reverse().find(b => vis(b) && !b.disabled && !/отмена|cancel|close|закрыть/i.test(txt(b)) && txt(b));
    if (ok) ok.click();
    await sleep(1500);
    const close = [...document.querySelectorAll(".el-dialog__headerbtn,[aria-label=Close]")].find(vis); if (close && vis(inp)) close.click();
    return "";
  }

  async function autoAdd() {
    send({ type: "lovlog", text: "Lovense: добавляю сайты…" });
    for (let round = 0; round < 2; round++) {
      const s = mySites(); if (!s) break;
      const miss = NEED.filter(x => !s.have.includes(x)); if (!miss.length) break;
      for (const name of miss) { const err = await addOne(name); if (err) send({ type: "lovlog", text: "Lovense: " + err }); await sleep(1200); }
    }
    report(true);
  }

  function report(done) {
    const s = mySites();
    send({ type: "lovsites", n: s ? s.n : null, have: s ? s.have : [], need: NEED, toys: toys(), done: !!done });
  }

  (async () => {
    await waitFor(() => mySites(), 15000);
    if (fresh) await autoAdd(); else report();
    setInterval(report, 10000);
  })();
})();
