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

  function step() {
    if (Date.now() > until()) return;
    for (const d of dialogs()) for (const b of d.querySelectorAll("button,a,[role=button],input[type=button],input[type=submit]"))
      if (vis(b) && OK.test(txt(b)) && !clicked.has(b)) { const t = txt(b); clicked.add(b); b.click(); log("нажала «" + t + "»"); }
    if (STREAM) for (const b of document.querySelectorAll("button,a,[role=button],input[type=button],input[type=submit]" + (P === "mv" ? ",[class*=go-live-button]" : "")))
      if (vis(b) && STREAM.test(txt(b)) && !clicked.has(b)) {
        if (Date.now() - loadT < delay) continue;
        const k = "aliciaClick:" + location.pathname, last = +(sessionStorage[k] || 0);
        if (Date.now() - last < 25000) continue;                      // одну и ту же кнопку не дёргаем чаще раза в 25 сек
        const t = txt(b); clicked.add(b); sessionStorage[k] = Date.now(); b.click(); log("нажала «" + t + "»");
      }
  }
  setInterval(step, 1000);
  // отчёт для панели: где оказались и видна ли кнопка запуска (через 6 сек после загрузки, только во время автозапуска)
  if (until() > Date.now()) setTimeout(() => {
    const has = STREAM ? [...document.querySelectorAll("button,a,[role=button]")].some(b => vis(b) && STREAM.test(txt(b))) : null;
    log("страница " + location.pathname + (STREAM ? (has ? " — кнопка запуска есть" : " — кнопки запуска НЕТ") : ""));
  }, 6000);

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
