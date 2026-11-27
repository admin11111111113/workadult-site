// 27.11 владелец: Reddit — бот готовит пост (раздел, фото, заголовок), панель горит зелёным «Reddit».
// Она жмёт кнопку → открывается reddit.com/…/submit#alicia-rd=ID → тут заполняем фото и заголовок, она жмёт «Опубликовать».
(() => {
  if (window.__aliciaRd || window.top !== window) return; window.__aliciaRd = 1;
  const HUB = "https://alicia-hub.workadult.pro/lk";
  const m = location.hash.match(/alicia-rd=([0-9a-f]{6,})/);
  if (m) sessionStorage.aliciaRd = m[1];
  const ID = sessionStorage.aliciaRd;
  if (!ID) return;
  const deep = (sel, root = document) => {          // поиск сквозь shadow DOM
    const r = root.querySelector(sel); if (r) return r;
    for (const e of root.querySelectorAll("*")) if (e.shadowRoot) { const x = deep(sel, e.shadowRoot); if (x) return x; }
    return null;
  };
  const sleep = t => new Promise(r => setTimeout(r, t));
  const banner = (t, ok) => {
    let b = document.getElementById("alicia-rd-b");
    if (!b) { b = document.createElement("div"); b.id = "alicia-rd-b";
      b.style.cssText = "position:fixed;z-index:2147483647;left:50%;top:70px;transform:translateX(-50%);padding:14px 22px;border-radius:14px;font:600 18px/1.35 system-ui,sans-serif;color:#fff;box-shadow:0 6px 30px #0008;max-width:90vw;text-align:center";
      document.documentElement.appendChild(b); }
    b.style.background = ok ? "#1f9d55" : "#b0362c"; b.textContent = t;
  };
  const done = url => { fetch(HUB + "/rd_done", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: ID, url }) }).catch(() => {}); sessionStorage.removeItem("aliciaRd"); };

  // уже опубликовано — Reddit переходит на страницу поста
  if (/\/comments\//.test(location.pathname)) { done(location.href); banner("Готово 💋 пост опубликован", true); setTimeout(() => { const b = document.getElementById("alicia-rd-b"); b && b.remove(); }, 6000); return; }
  if (!/\/submit/.test(location.pathname)) return;

  (async () => {
    banner("Заполняю пост…", true);
    let post = null;
    try { post = (await (await fetch(HUB + "/rd", { cache: "no-store" })).json()).post; } catch (e) {}
    if (!post || post.id !== ID) { banner("Этот пост уже не актуален — открой заново из панели", false); sessionStorage.removeItem("aliciaRd"); return; }
    let ti = null, fi = null;
    for (let i = 0; i < 40 && !(ti && fi); i++) {
      const pc = deep("post-composer-title"); ti = pc && (pc.shadowRoot ? pc.shadowRoot.querySelector("textarea") : null) || deep("textarea[name=title]");
      // проверено 27.11: фото принимает поле в самой странице (post-composer-attachment-entry), не то, что в r-post-media-input
      fi = document.querySelector("post-composer-attachment-entry input[type=file]") || document.querySelector("input[type=file][accept*=image]");
      await sleep(500);
    }
    if (!ti || !fi) { banner("Не нашла форму Reddit — обнови страницу", false); return; }
    const setTitle = () => {
      const pc = deep("post-composer-title"); const t = (pc && pc.shadowRoot && pc.shadowRoot.querySelector("textarea")) || ti;
      t.focus(); t.value = post.title;
      t.dispatchEvent(new Event("input", { bubbles: true, composed: true })); t.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    };
    setTitle();
    try {
      const blob = await (await fetch(post.img, { cache: "no-store" })).blob();
      const f = new File([blob], "alicia_" + post.id + (blob.type === "image/png" ? ".png" : ".jpg"), { type: blob.type || "image/jpeg" });
      const dt = new DataTransfer(); dt.items.add(f); fi.files = dt.files;
      fi.dispatchEvent(new Event("input", { bubbles: true, composed: true })); fi.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    } catch (e) { banner("Фото не загрузилось: " + e, false); return; }
    await sleep(2500); setTitle();                                   // после фото форма перерисовывается — заголовок ещё раз
    // 27.11: на её ПК фото долго висит «Загрузка…» — ждём, пока Reddit дозагрузит, только потом «готово»
    const uploading = (root = document) => {                        // видимая надпись «Загрузка…/Uploading…» (в т.ч. внутри shadow DOM)
      for (const e of root.querySelectorAll("*")) {
        if (e.shadowRoot && uploading(e.shadowRoot)) return true;
        if (e.childElementCount === 0 && /^\s*(Загрузка|Uploading)/i.test(e.textContent || "") && e.getClientRects().length) return true;
      }
      return false;
    };
    for (let i = 0; i < 120 && uploading(); i++) { banner("Загружаю фото на Reddit… подожди " + (i < 20 ? "" : "(медленный интернет) ") + "⏳", true); await sleep(1000); }
    if (uploading()) { banner("Фото так и не загрузилось — обнови страницу (F5)", false); return; }
    setTitle();
    banner("✅ Всё заполнено — проверь фото и нажми «Опубликовать»", true);
    // после «Опубликовать» Reddit уводит на страницу поста (там отметим «готово»); на всякий — следим за адресом
    let last = location.href;
    setInterval(() => { if (location.href !== last) { last = location.href; if (/\/comments\//.test(location.pathname)) { done(location.href); banner("Готово 💋 пост опубликован", true); } } }, 1000);
  })();
})();
