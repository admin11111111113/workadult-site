// Lovense Cam Extension (rugextension.lovense.com): сами добавляем 4 сайта при каждом эфире,
// читаем статус игрушек и отдаём всё в панель workadult.pro/kate.
(() => {
  if (window.__aliciaLV) return; window.__aliciaLV = 1;
  const NEED = ["Chaturbate", "Stripchat", "BongaCams", "ManyVids"];
  const send = m => { try { chrome.runtime.sendMessage(m); } catch (e) {} };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const vis = e => e && e.offsetParent !== null;
  const txt = e => (e.innerText || "").trim();

  function mySites() {
    const t = document.body.innerText || "", i = t.search(/Мои Вебкам-сайты|My Cam Sites|My Webcam Sites/i);
    if (i < 0) return null;
    let part = t.slice(i, i + 3000); const j = part.search(/Что нового|What's new/i); if (j > 0) part = part.slice(0, j);
    const n = +((/\((\d+)\)/.exec(part) || [])[1] || 0);
    // плюс названия в левом меню под «Вебкам-сайт» — там все сайты списком
    const menu = [...document.querySelectorAll(".el-menu-item")].map(txt).join("\n");
    return { n, have: NEED.filter(s => new RegExp("(^|\\n)\\s*" + s + "\\s*(\\n|$)", "i").test(part.slice(part.indexOf(")") + 1) + "\n" + menu)) };
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

  // Окно «Добавить вебкам-сайт» (проверено 20.11 на 31.6.9): «+» = .addsite у пункта «Вебкам-сайт»,
  // поле поиска readonly (печатать бесполезно) — кликаем пункт списка по тексту; настройки копируем с Chaturbate; «Готово».
  async function addOne(name) {
    const add = document.querySelector(".addsite") || byText("button,a,div,span", /^\+?\s*Добавить сайт с камерами$|^\+?\s*Add (cam|webcam) site/i);
    if (!add) return "нет кнопки «+» у «Вебкам-сайт»";
    add.click();
    const inp = await waitFor(() => [...document.querySelectorAll("input")].find(i => vis(i) && /Начните вводить|Start typing|search/i.test(i.placeholder || "")));
    if (!inp) return "не открылось окно";
    const dlg = inp.closest(".el-dialog,[role=dialog]") || document;
    inp.click(); await sleep(700);
    const item = await waitFor(() => [...document.querySelectorAll(".el-select-dropdown__item,[role=option]")].find(e => txt(e).toLowerCase() === name.toLowerCase()));
    if (!item) { const c = dlg.querySelector(".el-dialog__headerbtn"); c && c.click(); return "нет " + name + " в списке"; }
    item.scrollIntoView({ block: "nearest" }); item.click(); await sleep(700);
    const copy = [...dlg.querySelectorAll(".el-radio")].find(e => vis(e) && /Копировать|Copy/i.test(txt(e)));
    if (copy) { copy.click(); await sleep(700); }
    const ok = await waitFor(() => [...dlg.querySelectorAll("button")].find(b => vis(b) && !b.disabled && /^(Готово|Done|OK|Confirm|Подтвердить)$/i.test(txt(b))), 4000);
    if (!ok) { const c = dlg.querySelector(".el-dialog__headerbtn"); c && c.click(); return "не нажалась «Готово» для " + name; }
    ok.click(); await sleep(2500);
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
    const s = mySites();                       // добавляем только если чего-то не хватает (вкладки не переоткрываем)
    if (s && NEED.some(x => !s.have.includes(x)) && /\/pages\/settings/.test(location.pathname)) await autoAdd(); else report(true);
    setInterval(report, 10000);
  })();
})();
