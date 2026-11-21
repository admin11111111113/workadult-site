// Автозапуск эфира на сайтах. Панель по «Начать эфир» шлёт команду в канал go-<сайт> и перезагружает вкладку;
// здесь в течение ~90 сек жмём то, что сайт просит: CB/SC — «ОК/Подтвердить» в окошках, Bonga — «Стримить»
// (откроется новая страница — там ждём, пока кнопка снова станет активной, и жмём ещё раз), ManyVids — «Go Live».
(() => {
  if (window.__aliciaGo || window.top !== window) return; window.__aliciaGo = 1;
  const H = location.hostname;
  const P = /chaturbate/.test(H) ? "cb" : /stripchat|mywebcamroom/.test(H) ? "sc" : /bonga/.test(H) ? "bc" : /manyvids/.test(H) ? "mv" : "";
  if (!P) return;
  const send = m => { try { return chrome.runtime.sendMessage(m); } catch (e) { return Promise.resolve(null); } };
  const vis = e => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden" && !e.disabled && !/disabled/i.test(e.className || "") && e.getAttribute("aria-disabled") !== "true";
  const txt = e => (e.innerText || e.value || "").replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim();   // «Настроить стрим →» → «Настроить стрим»
  // срок автозапуска вшит панелью в код (GO_UNTIL) — работает с любым помощником; + старый путь через sessionStorage
  if (typeof GO_UNTIL !== "undefined" && GO_UNTIL > Date.now() && GO_UNTIL > +(sessionStorage.aliciaGo || 0)) sessionStorage.aliciaGo = GO_UNTIL;
  const until = () => +(sessionStorage.aliciaGo || 0);
  // системные confirm/alert сайта на время автозапуска отвечают «ОК» (в мир страницы — через <script>, если сайт позволит)
  if (until() > Date.now() && (P === "cb" || P === "sc")) try {
    const s = document.createElement("script");
    s.textContent = "(()=>{const on=()=>+(sessionStorage.aliciaGo||0)>Date.now(),c=confirm,a=alert;window.confirm=function(){return on()?true:c.apply(this,arguments)};window.alert=function(){return on()?void 0:a.apply(this,arguments)}})()";
    (document.head || document.documentElement).appendChild(s); s.remove();
  } catch (e) {}
  const log = t => send({ type: "golog", p: P, text: t });

  const OK = /^(ok|ок|okay|confirm|подтвердить|подтверждаю|да|yes|continue|продолжить|xác nhận|đồng ý|tiếp tục|i confirm|i agree)$/i;
  const STREAM = P === "bc" ? /^(стримить|начать стрим|начать трансляцию|stream|start streaming|go live)$/i
               : P === "mv" ? /^(go live|start live|start streaming|go live now)$/i
               : P === "sc" ? /^(настроить стрим|начать шоу|set up (a )?stream|start (the )?show|thiết lập phát sóng|bắt đầu (buổi diễn|show))$/i : null;
  const dialogs = () => [...document.querySelectorAll("[role=dialog],[role=alertdialog],.modal,dialog,[class*=modal i],[class*=dialog i],[class*=popup i],[class*=overlay i]")].filter(e => e.offsetParent !== null);
  const clicked = new WeakSet(), loadT = Date.now(), path = location.pathname;
  // второй шаг ждёт, пока OBS начнёт слать: Bonga /console — 2-е «Начать трансляцию» через 35 сек, SC комната — «Начать шоу» через 20 сек
  const delay = P === "bc" && /^\/console/.test(path) ? 35000 : P === "sc" && !/start-broadcasting/.test(path) ? 20000 : 0;

  // кнопки: настоящие button/a + «кнопки» из div/span с классом btn/button (у SC «Начать шоу» может быть такой)
  const SEL = "button,a,[role=button],input[type=button],input[type=submit],[class*=btn i],[class*=button i]";
  // берём самый внутренний подходящий элемент с точным текстом кнопки (не обёртку на полстраницы)
  const startBtns = () => !STREAM ? [] : [...document.querySelectorAll(SEL)].filter(b => vis(b) && STREAM.test(txt(b)) && ![...b.querySelectorAll(SEL)].some(c => vis(c) && STREAM.test(txt(c))));
  function step() {
    if (Date.now() > until()) return;
    for (const d of dialogs()) for (const b of d.querySelectorAll("button,a,[role=button],input[type=button],input[type=submit]"))
      if (vis(b) && OK.test(txt(b)) && !clicked.has(b)) { const t = txt(b); clicked.add(b); b.click(); log("нажала «" + t + "»"); }
    for (const b of startBtns())
      if (!clicked.has(b)) {
        if (Date.now() - loadT < delay) continue;
        const k = "aliciaClick:" + location.pathname, last = +(sessionStorage[k] || 0);
        if (Date.now() - last < 25000) continue;                      // одну и ту же кнопку не дёргаем чаще раза в 25 сек
        const t = txt(b); clicked.add(b); sessionStorage[k] = Date.now(); b.click(); log("нажала «" + t + "»");
      }
  }
  setInterval(step, 1000);
  // ManyVids: в эфире ли она — на странице live нет кнопки «GO LIVE» (после запуска её сменяет управление эфиром) и камера включена
  if (P === "mv" && /\/live/i.test(location.pathname)) {
    const mvLive = () => {
      const goBtn = [...document.querySelectorAll("button,[role=button],[class*=go-live-button]")].some(b => vis(b) && STREAM.test(txt(b)));
      const cam = [...document.querySelectorAll("video")].some(v => v.srcObject && v.srcObject.active);
      send({ type: "live", p: "mv", on: !goBtn && cam, st: goBtn ? "offline" : cam ? "live" : "?" });
    };
    setTimeout(mvLive, 4000); setInterval(mvLive, 10000);
  }
  // Bonga: в эфире ли — по консоли: есть кнопка «Остановить/Завершить трансляцию» = идёт; «Начать трансляцию» = нет
  if (P === "bc") {
    const STOP = /(останов|заверш|прекрат|выключ|stop|end|finish)\w* ?(трансляц|стрим|эфир|stream|broadcast|show)/i;
    const bcLive = () => {
      const all = [...document.querySelectorAll("button,a,[role=button],[class*=btn i],[class*=button i]")].filter(vis).map(txt);
      if (all.some(t => STOP.test(t) && t.length < 40)) send({ type: "live", p: "bc", on: true, st: "live" });
      else if (/^\/console/.test(location.pathname) && all.some(t => STREAM.test(t))) send({ type: "live", p: "bc", on: false, st: "offline" });
    };
    setTimeout(bcLive, 4000); setInterval(bcLive, 10000);
  }
  // отчёт для панели: где оказались и видна ли кнопка запуска (через 6 сек после загрузки, только во время автозапуска)
  // если кнопки нет — пишем, что похожего на странице видно (чтобы понять, что жать, а не гадать)
  const report = () => {
    if (!STREAM) return log("страница " + location.pathname);
    const b = startBtns()[0];
    if (!b && Date.now() - +(sessionStorage["aliciaClick:" + location.pathname] || 0) < 60000) return;   // уже нажала — молчим
    if (b) return log("страница " + location.pathname + " — вижу кнопку «" + txt(b) + "»" + (Date.now() - loadT < delay ? ", нажму через " + Math.round((delay - (Date.now() - loadT)) / 1000) + " сек" : ""));
    const near = [...new Set([...document.querySelectorAll(SEL)].filter(e => e.getClientRects().length && /шоу|show|стрим|stream|трансляц|live|phát|diễn/i.test(txt(e)) && txt(e).length < 40)
      .map(e => txt(e) + (vis(e) ? "" : " (неактивна)")))].slice(0, 5);
    log("страница " + location.pathname + " — кнопки запуска пока нет" + (near.length ? "; вижу: " + near.join(" · ") : ""));
  };
  if (until() > Date.now()) { setTimeout(report, 6000); if (delay) setTimeout(report, delay + 3000); }

  // команда панели: включить режим «запуск эфира» на 90 сек (переживает перезагрузку вкладки — sessionStorage)
  // команду забирает только «своя» вкладка (а не, скажем, вкладка сообщений того же сайта)
  const mine = () => P === "cb" ? /^\/b\//.test(location.pathname) : P === "sc" ? /broadcast/i.test(location.pathname) : P === "bc" ? true
    : /live|stream|studio|broadcast/i.test(location.pathname) || (STREAM && [...document.querySelectorAll("button,a")].some(b => b.offsetParent !== null && STREAM.test(txt(b))));
  setInterval(async () => {
    if (!mine()) return;
    const c = await send({ type: "poll", ch: "go-" + P });
    if (c && c.go) { sessionStorage.aliciaGo = Date.now() + (c.ms || 90000); log("жду кнопки запуска…"); }
  }, 1500);

  // запоминаем страницу, где есть кнопка запуска (для ManyVids/Bonga панель потом открывает её сама)
  if (STREAM) setTimeout(() => {
    if ([...document.querySelectorAll("button,a,[role=button]")].some(b => b.offsetParent !== null && STREAM.test(txt(b))))
      send({ type: "golearn", p: P, url: location.href });
  }, 5000);
})();
