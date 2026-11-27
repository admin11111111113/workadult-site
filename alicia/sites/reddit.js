// 27.11 владелец: Reddit — бот готовит посты (раздел, фото, заголовок), панель горит зелёным «Reddit».
// Она жмёт кнопку → открывается reddit.com/…/submit#alicia-rd=ID → тут бот сам заполняет и публикует, как человек (паузы),
// потом в этой же вкладке ждёт несколько минут и делает следующий раздел. Ей — только не закрывать вкладку.
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
  const deepAll = (pred, root = document, out = []) => {
    for (const e of root.querySelectorAll("*")) { if (pred(e)) out.push(e); if (e.shadowRoot) deepAll(pred, e.shadowRoot, out); }
    return out;
  };
  const sleep = t => new Promise(r => setTimeout(r, t));
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a));
  const banner = (t, ok) => {
    let b = document.getElementById("alicia-rd-b");
    if (!b) { b = document.createElement("div"); b.id = "alicia-rd-b";
      b.style.cssText = "position:fixed;z-index:2147483647;left:50%;top:70px;transform:translateX(-50%);padding:14px 22px;border-radius:14px;font:600 18px/1.35 system-ui,sans-serif;color:#fff;box-shadow:0 6px 30px #0008;max-width:90vw;text-align:center";
      document.documentElement.appendChild(b); }
    b.style.background = ok ? "#1f9d55" : "#b0362c"; b.textContent = t;
  };
  const post_ = (path, obj) => fetch(HUB + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(obj) }).catch(() => {});
  const getPost = async () => { try { return (await (await fetch(HUB + "/rd", { cache: "no-store" })).json()).post; } catch (e) { return undefined; } };
  const mmss = s => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

  // после поста — ждём следующий раздел и открываем его в этой же вкладке
  let chained = false;
  const chain = async () => {
    if (chained) return; chained = true;
    sessionStorage.removeItem("aliciaRd");
    for (let i = 0; i < 90; i++) {                                   // хаб готовит следующий пост (ИИ-заголовок) — до ~3 мин
      const p = await getPost();
      if (p && p.id !== ID) {
        let w = p.wait || 0;
        while (w > 0) { banner("✅ Готово 💋 Следующий пост — r/" + p.sub + " через " + mmss(w) + ". Вкладку не закрывай", true); await sleep(1000); w--; }
        sessionStorage.aliciaRd = p.id; location.href = p.url; return;
      }
      if (i > 40 && p === null) break;                               // ~80 с нет следующего — круг на сегодня закончен
      await sleep(2000);
    }
    banner("✅ На сегодня всё 💋 вкладку можно закрыть", true);
  };
  const done = url => { post_("/rd_done", { id: ID, url }); chain(); };

  // уже опубликовано — Reddit переходит на страницу поста
  if (/\/comments\//.test(location.pathname)) { banner("✅ Пост опубликован 💋", true); done(location.href); return; }
  if (!/\/submit/.test(location.pathname)) return;

  (async () => {
    banner("Заполняю пост…", true);
    const post = await getPost();
    if (!post || post.id !== ID) { banner("Этот пост уже не актуален — открой заново из панели", false); sessionStorage.removeItem("aliciaRd"); return; }
    let ti = null, fi = null;
    for (let i = 0; i < 40 && !(ti && fi); i++) {
      const pc = deep("post-composer-title"); ti = pc && (pc.shadowRoot ? pc.shadowRoot.querySelector("textarea") : null) || deep("textarea[name=title]");
      // проверено 27.11: фото принимает поле в самой странице (post-composer-attachment-entry), не то, что в r-post-media-input
      fi = document.querySelector("post-composer-attachment-entry input[type=file]") || document.querySelector("input[type=file][accept*=image]");
      await sleep(500);
    }
    if (!ti || !fi) { banner("Не нашла форму Reddit — обнови страницу (F5)", false); return; }
    const setTitle = () => {
      const pc = deep("post-composer-title"); const t = (pc && pc.shadowRoot && pc.shadowRoot.querySelector("textarea")) || ti;
      t.focus(); t.value = post.title;
      t.dispatchEvent(new Event("input", { bubbles: true, composed: true })); t.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    };
    await sleep(rnd(1500, 3500)); setTitle();
    try {
      const blob = await (await fetch(post.img, { cache: "no-store" })).blob();
      const f = new File([blob], "alicia_" + post.id + (blob.type === "image/png" ? ".png" : ".jpg"), { type: blob.type || "image/jpeg" });
      const dt = new DataTransfer(); dt.items.add(f); fi.files = dt.files;
      fi.dispatchEvent(new Event("input", { bubbles: true, composed: true })); fi.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    } catch (e) { banner("Фото не загрузилось: " + e, false); return; }
    await sleep(2500); setTitle();                                   // после фото форма перерисовывается — заголовок ещё раз
    // 27.11: на её ПК фото долго висит «Загрузка…» — ждём, пока Reddit дозагрузит
    const uploading = (root = document) => {
      for (const e of root.querySelectorAll("*")) {
        if (e.shadowRoot && uploading(e.shadowRoot)) return true;
        if (e.childElementCount === 0 && /^\s*(Загрузка|Uploading)/i.test(e.textContent || "") && e.getClientRects().length) return true;
      }
      return false;
    };
    for (let i = 0; i < 120 && uploading(); i++) { banner("Загружаю фото на Reddit… подожди " + (i < 20 ? "" : "(медленный интернет) ") + "⏳", true); await sleep(1000); }
    if (uploading()) { banner("Фото так и не загрузилось — обнови страницу (F5)", false); return; }
    setTitle();

    // публикуем сами — с паузой, как человек
    const pubBtn = () => deepAll(e => e.tagName === "BUTTON" && /^(Опубликовать|Post)$/i.test((e.innerText || e.textContent || "").trim()) && e.getClientRects().length)[0];
    let w = rnd(6, 15);
    while (w > 0) { banner("✅ Всё заполнено — публикую сама через " + w + " с… 💋", true); await sleep(1000); w--; }
    const b = pubBtn();
    if (!b || b.disabled || b.getAttribute("aria-disabled") === "true") {
      banner("Reddit не даёт опубликовать — проверь форму и нажми «Опубликовать» сама", false); return;
    }
    let last = location.href;
    const watch = setInterval(() => { if (location.href !== last) { last = location.href; if (/\/comments\//.test(location.pathname)) { clearInterval(watch); banner("✅ Пост опубликован 💋", true); done(location.href); } } }, 1000);
    b.click(); banner("Публикую… ⏳", true);
    await sleep(45000);
    if (!chained) {                                                  // не ушло — Reddit что-то не принял (правила раздела / флэр / лимит)
      clearInterval(watch);
      const err = deepAll(e => e.childElementCount === 0 && e.getClientRects().length && /(error|ошибк|flair|флэр|required|обязател|limit|лимит|not allowed|не разреш|try again|повтор)/i.test(e.textContent || "") && (e.textContent || "").length < 200)
        .map(e => e.textContent.trim()).slice(0, 3).join(" · ");
      banner("Reddit не принял пост в r/" + post.sub + (err ? ": " + err : "") + " — пропускаю, дальше следующий раздел", false);
      post_("/rd_skip", { id: ID, why: err || "не опубликовалось за 45 с" }); await sleep(4000); chain();
    }
  })();
})();
