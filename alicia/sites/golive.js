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
  // ── ПРИВАТ: запрос привата на странице сайта → окно в её панели (Принять/Отклонить); кнопку на сайте жмём по её команде.
  // Запрос = видимая кнопка «Принять/Accept» внутри небольшого блока, где написано «приват/private». Сами ничего не принимаем.
  const ACC = /^(принять|accept|approve|согласиться|начать приват|start private( show)?|chấp nhận)$/i, DEC = /^(отклонить|decline|reject|deny|отказаться|từ chối)$/i;
  const PRIV = /приват|private|privat|riêng tư|exclusive|эксклюзив/i;
  let REQ = null;                                                    // {acc, dec, key}
  const PCMD = "https://alicia-link.videorils.workers.dev/pcmd?p=" + P;
  setInterval(async () => {
    let found = null;
    for (const b of document.querySelectorAll("button,a,[role=button],[class*=btn i],[class*=button i]")) {
      if (!vis(b) || !ACC.test(txt(b))) continue;
      let c = b; for (let i = 0; i < 7 && c.parentElement; i++) { c = c.parentElement; const t = (c.innerText || ""); if (t.length > 700) break;
        if (/друз|friend|bạn bè|подписк|follow/i.test(t)) break;    // заявка в друзья / уведомления — не приват (SC 22.11)
        if (PRIV.test(t)) { found = { acc: b, box: c }; break; } }
      if (found) break;
    }
    if (found) {
      const t = (found.box.innerText || "").replace(/\s+/g, " ").trim().slice(0, 220), tk = t.replace(/\d+/g, "#");   // 24.11: таймер в окне не = новый запрос
      found.dec = [...found.box.querySelectorAll("button,a,[role=button],[class*=btn i],[class*=button i]")].find(x => vis(x) && DEC.test(txt(x)));
      if (!REQ || REQ.key !== tk) send({ type: "privreq", p: P, text: t });
      REQ = { ...found, key: tk };
      try { const c = await (await fetch(PCMD + "&a=accept,decline", { cache: "no-store" })).json();   // её ответ из панели
        if (c && (c.act === "accept" || c.act === "decline")) { /* 24.11: c2c/lovstop не = «отклонить» */ const b = c.act === "accept" ? REQ.acc : REQ.dec; if (b) { b.click(); log((c.act === "accept" ? "приняла" : "отклонила") + " приват"); } else log("кнопки «Отклонить» нет — откажи на сайте"); } } catch (e) {}
    } else if (REQ) { REQ = null; send({ type: "privgone", p: P }); }
  }, 2000);
  // идёт ли приват сейчас (по надписям на странице)
  const PRIVON = /(private show (is )?(in progress|started|active)|you are in (a )?private|in private show|приват(ное шоу|ный чат)? (идёт|начал|начато|активн)|завершить приват|закончить приват|end private|stop private|đang (show )?riêng tư)/i;
  let PON = null;
  // CB/SC приват шлют cb.js/sc.js по статусу комнаты из API сайта; ManyVids — roomState своей комнаты; Bonga — по надписям консоли
  if (P === "bc") setInterval(() => { const on = PRIVON.test((document.body && document.body.innerText || "").slice(0, 200000)); if (on !== PON) { PON = on; send({ type: "private", p: P, on }); } }, 3000);
  if (P === "mv" && /\/live/i.test(location.pathname)) setInterval(async () => {
    try { const t = await (await fetch("/live/cam/bad_secret", { cache: "no-store" })).text(), m = t.match(/roomState\\?":\\?"([A-Z_]+)/);
      const on = !!m && /PRIVATE|EXCLUSIVE|GROUP/.test(m[1]); if (on !== PON) { PON = on; send({ type: "private", p: P, on }); } } catch (e) {} }, 5000);
  // ── Lovense «Ссылка управления»: окно их расширения на странице сайта (код, игрушки, таймер) → её панель и консоль владельца.
  // Ищем в DOM и в открытых shadow-root; «Закончить управление» жмём по её команде из панели (pcmd act=lovstop).
  const LCT = /ссылка управления|control link/i, LSES = /сеанс управления|control session|закончить управление|end control|stop control|ожидани|waiting/i;
  const deep = (root, out) => { for (const e of root.querySelectorAll("*")) { out.push(e); if (e.shadowRoot) deep(e.shadowRoot, out); } return out; };
  const roots = (r, out) => { out.push(r); for (const e of r.querySelectorAll("*")) if (e.shadowRoot) roots(e.shadowRoot, out); return out; };
  let LC = null, lcLast = "", lcProbe = 0;
  setInterval(async () => {
    let box = null;                                                  // дёшево: сначала textContent (без перерасчёта страницы)
    for (const r of roots(document, [])) {
      const all = r === document ? document.body : r; if (!all || !LCT.test(all.textContent || "")) continue;
      for (const e of r.querySelectorAll("*")) { const t = e.textContent || ""; if (t.length < 800 && LCT.test(t) && LSES.test(t) && vis(e)) box = e; }
    }
    // box — самый вложенный подходящий (последний в порядке обхода)
    if (box) {
      const t = box.innerText.replace(/[ \t]+/g, " ").trim(), lines = t.split("\n").map(s => s.trim()).filter(Boolean);
      const info = { on: /начался|started|active|закончить управление|end control/i.test(t), code: (t.match(/\b[A-Z0-9]{5,8}\b/) || [])[0] || "",
        timer: (t.match(/\b\d{1,2}:\d{2}(:\d{2})?\b/) || [])[0] || "", limit: (t.match(/неограниченно|unlimited|\d+\s*(мин|min|сек|sec)\w*/i) || [])[0] || "",
        toys: lines.filter(l => /lush|nora|max|domi|hush|edge|osci|ferri|dolce|gush|ambi|diamo|calor|machine|машин|gravity|solace|tenera|flexer|vulse|mission/i.test(l)).slice(0, 4) };
      const k = JSON.stringify(info); LC = box;
      if (k !== lcLast) { lcLast = k; send({ type: "lovctl", p: P, ...info }); }
      if (!REQ) try { const c = await (await fetch(PCMD + "&a=lovstop", { cache: "no-store" })).json();   // 24.11: пока висит запрос привата — команды забирает только он
        if (c && c.act === "lovstop") { const b = deep(box, []).find(x => /закончить управление|end control|stop control/i.test(x.innerText || "") && x.children.length <= 2);
          if (b) { b.click(); log("закончила управление Lovense"); } } } catch (e) {}
    } else if (LC) { LC = null; lcLast = ""; send({ type: "lovctl", p: P, on: false, gone: true }); }
    else if (!lcProbe++ && P === "cb") {                             // разведка один раз: где у Lovense окно, если не нашли
      const fr = [...document.querySelectorAll("iframe")].map(f => f.src || "").filter(s => /lovense/i.test(s)).map(s => s.split("?")[0].slice(-70));
      if (fr.length) send({ type: "probe", p: P, text: "Lovense во фреймах: " + fr.join(" ") });
    }
  }, 3000);
  // Чат комнаты Bonga (консоль) / ManyVids (страница эфира) → панель, комната своего сайта.
  // Ищем контейнер чата (class с chat/message, много однотипных детей); новые строки «ник: текст» шлём в панель.
  // + разведка: раз в загрузку шлём, какой контейнер нашли (видно в журнале владельца) — чтобы донастроить по факту.
  // Разметка (22.11, видно зрителем): Bonga — div.js-chat_msg[data-author] (.author_area[data-name] = ник; класс mb_gold/mb_unlimited/… = платящий,
  // msg_model = она); ManyVids — ul[class*=public-chat] > li[class*=received-message] (ник = alt аватарки «ник avatar», класс __creator = она).
  if (P === "mv" && /\/live/i.test(location.pathname)) {                 // Bonga — свой блок ниже (24.11)
    const ROW = P === "bc" ? ".js-chat_msg" : "li[class*=received-message]", done = new WeakSet(), t1 = Date.now();
    const parse = n => {
      let who = "", me = false, lvl = 0;
      if (P === "bc") { const a = n.querySelector(".author_area[data-name]"); who = a ? a.dataset.name : n.dataset.author || ""; me = /msg_model|mb_model/.test(n.className);
        lvl = /unlim|ultim|vip|premium/i.test(n.className) ? 3 : /gold/i.test(n.className) ? 2 : /mb_(member|basic)/.test(n.className) ? 0 : 0; }
      else { const im = n.querySelector("img[alt$=' avatar']"); who = im ? im.alt.replace(/ avatar$/, "") : ""; me = /creator/i.test(n.className); }
      let text = (n.innerText || "").replace(/\s+/g, " ").trim();
      if (who && text.toLowerCase().startsWith(who.toLowerCase())) text = text.slice(who.length).replace(/^[:：\s]+/, "");
      return who && text && text.length < 400 ? { who, text, lvl, me } : null;
    };
    new MutationObserver(ms => {
      if (Date.now() - t1 < 5000) return;                              // историю при загрузке не шлём
      for (const m of ms) for (const n of m.addedNodes) {
        if (n.nodeType !== 1) continue;
        for (const r of n.matches(ROW) ? [n] : n.querySelectorAll(ROW)) { if (done.has(r)) continue; done.add(r); const x = parse(r); if (x) send({ type: "chat", p: P, ...x }); }
      }
    }).observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { const n = document.querySelectorAll(ROW).length; send({ type: "probe", p: P, text: "чат: строк " + n + (n ? "" : " — не нашла чат на странице") }); }, 15000);
  }
  // 24.11: в консоли Бонги чат не .js-chat_msg (разведка «строк 0», приват Lincoln41 — его сообщений в панели не было).
  // Опрос раз в 1.5 с: строки чата по нескольким признакам, и в самой странице, и в iframe того же сайта. Первый проход = история, не шлём.
  // Разведка: что за элементы появляются с текстом «ник: …» — в журнал владельца (до 3 раз), чтобы донастроить по факту.
  if (P === "bc" && /^\/console/.test(location.pathname)) {
    const R2 = ".js-chat_msg,.msg_row,[class*=chat_msg],[class*=chat-msg],[class*=chatMessage],[class*=chat-message],[class*=message_item],[class*=messageItem],[data-author]";
    const seen = new WeakSet(); let first = true, sent = 0, probes = 0;
    const docs = () => { const out = [document]; for (const f of document.querySelectorAll("iframe")) try { if (f.contentDocument && f.contentDocument.body) out.push(f.contentDocument); } catch (e) {} return out; };
    const who2 = n => { const a = n.querySelector(".author_area[data-name],[data-name],[class*=author i],[class*=nick i],[class*=name i],[class*=login i]");
      return ((a && (a.dataset.name || a.innerText)) || n.dataset.author || "").replace(/[:：]\s*$/, "").trim().slice(0, 40); };
    const diag = why => { if (probes >= 3) return; probes++;
      const d = docs(), fr = [...document.querySelectorAll("iframe")].map(f => (f.src || "about:blank").split("?")[0].slice(-60)).slice(0, 4);
      const cls = {}; for (const x of d) for (const e of x.querySelectorAll("[class]")) { const c = typeof e.className === "string" ? e.className : ""; for (const k of c.split(/\s+/)) if (/msg|chat|message/i.test(k) && !/input|send|smile|emoji/i.test(k)) cls[k] = (cls[k] || 0) + 1; }
      const top = Object.entries(cls).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => k + "×" + v).join(" ");
      send({ type: "probe", p: P, text: "консоль (" + why + "): строк " + d.reduce((s, x) => s + x.querySelectorAll(R2).length, 0) + " · фреймов " + fr.length + (fr.length ? " [" + fr.join(", ") + "]" : "") + " · классы: " + (top || "нет") }); };
    setInterval(() => {
      for (const x of docs()) for (const r of x.querySelectorAll(R2)) {
        if (seen.has(r)) continue; seen.add(r); if (/input|send|smile|emoji/i.test(r.className || "")) continue;
        if (r.parentElement && r.parentElement.closest(R2)) continue;               // вложенный кусок той же строки
        if (first) continue;
        const raw = (r.innerText || "").replace(/\s+/g, " ").trim(); if (!raw || raw.length > 400) continue;
        let who = who2(r), text = raw;
        if (who && text.toLowerCase().startsWith(who.toLowerCase())) text = text.slice(who.length).replace(/^[:：\s]+/, "");
        else if (!who) { const m = raw.match(/^([\w.\-]{2,30})\s*[:：]\s*(.+)$/); if (m) { who = m[1]; text = m[2]; } }
        if (!who || !text) continue;
        const me = /msg_model|mb_model|model/i.test(r.className || ""), lvl = /unlim|ultim|vip|premium/i.test(r.className) ? 3 : /gold/i.test(r.className) ? 2 : 0;
        send({ type: "chat", p: P, who, text, lvl, me }); sent++;
      }
      first = false;
    }, 1500);
    // личка в консоли (окошко с ником, .bm_im_float_dialog → .bm_im_history_item, своё = __own, текст .imhi_text) → панель как "pm"
    const pmSeen = new Set(); let pmFirst = true;
    setInterval(() => {
      for (const it of document.querySelectorAll(".bm_im_history_item")) {
        const id = it.dataset.id || ""; if (!id || pmSeen.has(id)) continue; pmSeen.add(id);
        if (pmFirst) continue;
        const box = it.closest(".bm_im_float_dialog,[class*=im_dialog],[class*=float_window]") || document;
        const who = ((box.querySelector(".imfd_title,[class*=title]") || {}).innerText || "").trim().slice(0, 40);
        const text = ((it.querySelector(".imhi_text") || it).innerText || "").replace(/\s+/g, " ").trim().slice(0, 400);
        if (text) send({ type: "pm", p: P, who, text, me: /__own/.test(it.className) });
      }
      pmFirst = false;
    }, 1500);
    setTimeout(() => diag("через 20 с"), 20000);
    let wasOn = false; setInterval(() => { const on = PRIVON.test((document.body && document.body.innerText || "").slice(0, 200000)); if (on && !wasOn) setTimeout(() => diag("приват, отправлено строк " + sent), 15000); wasOn = on; }, 3000);
  }
  // ── 24.11 владелец: зрители с токенами — прямо из её открытых вкладок (хабу не надо открывать комнату зрителем).
  // Раз в 45 сек: CB/SC — API сайта из её же вкладки эфира (её куки), Bonga — вкладка «Зрители» в консоли. Только кто с токенами.
  const SCBAL = {};
  const usersOnce = async () => {
    const ab = () => { const c = new AbortController(); setTimeout(() => c.abort(), 15000); return c.signal; };
    if (P === "cb" && /^\/b\//.test(location.pathname)) {
      const room = location.pathname.split("/")[2] || "_skitlstrynka_", LV = { l: 1, b: 2, p: 3, f: 3, t: 4 };
      const t = await (await fetch("/api/getchatuserlist/?roomname=" + room + "&private=false&sort_by=a&exclude_staff=false", { signal: ab(), credentials: "include" })).text();
      return t.split(",").slice(2).map(x => x.split("|")).filter(a => a.length >= 2 && LV[a[1]]).map(a => ({ who: a[0], lvl: LV[a[1]] }));
    }
    if (P === "sc" && /broadcast|skitlstrynka/i.test(location.pathname)) {
      const d = await (await fetch("/api/front/v2/models/193919081/members", { signal: ab(), credentials: "include" })).json();
      const lg = u => ((u.userRanking || {}).league || "grey").toLowerCase();
      const us = (d.members || []).map(m => m.user).filter(u => u && !u.isModel).map(u => ({ who: u.username, uid: String(u.id), lg: lg(u),
        lvl: Math.max(u.isUltimate ? 3 : 0, /royal|legend/.test(lg(u)) ? 4 : /diamond/.test(lg(u)) ? 3 : /gold/.test(lg(u)) ? 2 : /bronze|silver/.test(lg(u)) ? 1 : 0, u.isGreen ? 1 : 0) }));
      // 24.11 владелец: баланс СЕЙЧАС — Стрип отдаёт модели (то же, что в карточке при наведении): /models/{я}/users/{он}/info → tokens (null = скрыт)
      const now = Date.now(), need = us.filter(u => !(SCBAL[u.uid] && now - SCBAL[u.uid].t < 180000)).sort((x, y) => y.lvl - x.lvl).slice(0, 30);
      for (let i = 0; i < need.length; i += 6) await Promise.all(need.slice(i, i + 6).map(async u => { try {
        const j = await (await fetch("/api/front/models/193919081/users/" + u.uid + "/info", { signal: ab(), credentials: "include" })).json();
        SCBAL[u.uid] = { t: now, bal: j.tokens === null || j.tokens === undefined ? null : Math.max(0, +j.tokens || 0), hid: j.tokens === null }; } catch (e) {} }));
      return us.map(u => { const b = SCBAL[u.uid]; return b ? { ...u, ...(b.hid ? { hid: 1 } : { bal: b.bal }) } : u; }).filter(u => u.lvl >= 1 || u.bal > 0 || u.hid);
    }
    if (P === "bc" && /^\/console/.test(location.pathname)) {
      const v = [...document.querySelectorAll(".user_item.member[username]")];
      if (!v.length) return null;                                       // вкладка «Зрители» не открыта — молчим, не путаем «никого нет»
      return v.filter(e => !/member_free/.test(e.className)).map(e => { const b = ((e.innerText || "").match(/(\d[\d\s]{0,7})\s*(Tkn|Ток|tk)/i) || [])[1];   // 24.11: в списке «Люди» консоли виден баланс «796 Tkn»
        return { who: e.getAttribute("username"), lvl: /platin|diamond|vip|unlim|ultim/.test(e.className) ? 3 : 2, ...(b ? { bal: +b.replace(/\s/g, "") } : {}) }; });
    }
    return null;
  };
  if (P !== "mv") setInterval(async () => { try { const l = await usersOnce(); if (l) send({ type: "users", p: P, list: l.slice(0, 300) }); } catch (e) {} }, 45000);
  // ManyVids: не вошла в аккаунт (страница входа / поле пароля / кнопка «Log in» в шапке) — говорим панели
  if (P === "mv") setTimeout(() => {
    const out = /login|signin|sign-in/i.test(location.pathname) || [...document.querySelectorAll("input[type=password]")].some(vis)
      || [...document.querySelectorAll("a,button")].some(b => vis(b) && /^(log ?in|sign ?in|войти)$/i.test(txt(b)));
    send({ type: "login", p: "mv", ok: !out });
    if (out && until() > Date.now()) log("не вошла в аккаунт — эфир не запустить, войди и нажми «Начать эфир» ещё раз");
  }, 5000);
  // ManyVids: в эфире ли она — на странице live нет кнопки «GO LIVE» (после запуска её сменяет управление эфиром) и камера включена
  if (P === "mv" && /\/live/i.test(location.pathname)) {
    const mvLive = async () => {
      const goBtn = [...document.querySelectorAll("button,[role=button],[class*=go-live-button]")].some(b => vis(b) && STREAM.test(txt(b)));
      const cam = [...document.querySelectorAll("video")].some(v => (v.srcObject && v.srcObject.active) || (!v.paused && v.readyState >= 2));
      // главное — что говорит сам ManyVids о её комнате (roomState); кнопка/камера — запасной признак (22.11: эфир шёл, а панель не видела)
      let rs = ""; try { const t = await (await fetch("/live/cam/bad_secret", { cache: "no-store" })).text(); rs = (t.match(/roomState\\?":\\?"([A-Z_]+)/) || [])[1] || ""; } catch (e) {}
      const on = rs ? !/^(OFFLINE|NONE|ENDED)$/.test(rs) : (!goBtn && cam);
      send({ type: "live", p: "mv", on, st: rs || (goBtn ? "offline" : cam ? "live" : "?") });
      // сколько заработала за этот эфир — сайт сам пишет «LIVE EARNINGS 12 Tks»
      const e = (document.body.innerText.match(/LIVE EARNINGS\s*([\d,.\s]+?)\s*Tks/i) || [])[1];
      if (e !== undefined) send({ type: "earn", p: "mv", tk: +e.replace(/\D/g, "") || 0 });
    };
    setTimeout(mvLive, 4000); setInterval(mvLive, 10000);
  }
  // Bonga: в эфире ли — по консоли: есть кнопка «Остановить/Завершить трансляцию» = идёт; «Начать трансляцию» = нет
  if (P === "bc") {
    const STOP = /(останов|заверш|прекрат|выключ|stop|end|finish)\w* ?(трансляц|стрим|эфир|stream|broadcast|show)/i;
    const bcLive = () => {
      const all = [...document.querySelectorAll("button,a,[role=button],[class*=btn i],[class*=button i]")].filter(vis).map(txt);
      // в консоли идёт видео из OBS и кнопки «Начать трансляцию» уже нет — значит эфир идёт (даже если кнопка стопа называется иначе)
      const vid = /^\/console/.test(location.pathname) && [...document.querySelectorAll("video")].some(v => !v.paused && v.readyState >= 2 && vis(v));
      if (all.some(t => STOP.test(t) && t.length < 40) || (vid && !all.some(t => STREAM.test(t)))) send({ type: "live", p: "bc", on: true, st: "live" });
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

  // ── её сообщение из панели (вкладка «Приватный чат») → в поле чата на странице эфира + «Отправить» (22.11)
  const SAYIN = /message|сообщ|chat|чат|type|напиши|say|tin nhắn|comment|write/i;
  const chatInput = () => [...document.querySelectorAll("textarea,input[type=text],input:not([type]),[contenteditable=true],[contenteditable='']")]
    .filter(e => e.getClientRects().length && !e.disabled && !e.readOnly && !/search|поиск|tìm/i.test((e.placeholder || "") + (e.getAttribute("aria-label") || "") + (e.name || "")))
    .sort((a, b) => (SAYIN.test((b.placeholder || "") + (b.getAttribute("aria-label") || "") + (b.getAttribute("data-placeholder") || "")) ? 1 : 0) - (SAYIN.test((a.placeholder || "") + (a.getAttribute("aria-label") || "") + (a.getAttribute("data-placeholder") || "")) ? 1 : 0)
      || b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0];
  async function say(text) {
    const el = chatInput(); if (!el) return "не нашла поле чата на странице";
    el.focus();
    if (el.isContentEditable) { document.execCommand("selectAll", false); document.execCommand("insertText", false, text); }
    else { const set = Object.getOwnPropertyDescriptor(el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value").set;
      set.call(el, text); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
    await new Promise(r => setTimeout(r, 300));
    let box = el, btn = null;                                         // кнопка «Отправить» рядом с полем
    for (let i = 0; i < 5 && box.parentElement && !btn; i++) { box = box.parentElement;
      btn = [...box.querySelectorAll("button,[role=button]")].find(b => vis(b) && (/^(send|отправить|gửi|say|post)$/i.test(txt(b)) || /send|отправ|submit/i.test((b.getAttribute("aria-label") || "") + (b.title || "") + (b.className || "")))); }
    if (btn) btn.click();
    else for (const t of ["keydown", "keypress", "keyup"]) el.dispatchEvent(new KeyboardEvent(t, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
    await new Promise(r => setTimeout(r, 700));
    const left = el.isContentEditable ? el.innerText.trim() : el.value.trim();
    return left && left === text.trim() ? "текст в поле, но не ушёл — нажми Enter на сайте" : "";
  }
  setInterval(async () => {
    // куда писать: CB /b/, SC — страница эфира или её комната, Bonga — консоль, MV — страница live
    if (!(P === "bc" ? /^\/console/.test(location.pathname) : P === "sc" ? /broadcast|skitlstrynka/i.test(location.pathname) : mine()) || !chatInput()) return;
    let c = await send({ type: "poll", ch: "say-" + P });           // помощник 1.1
    if (!(c && c.text) && Date.now() - (window.__sayW || 0) > 6000) try { window.__sayW = Date.now(); c = await (await fetch("https://alicia-link.videorils.workers.dev/say?p=" + P, { cache: "no-store" })).json(); } catch (e) { c = null; }   // помощник 1.0 — с сервера напрямую
    if (c && c.text) { const err = await say(c.text); send({ type: "saidres", p: P, id: c.id, ok: !err, err }); try { fetch("https://alicia-link.videorils.workers.dev/say?res=1", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: c.id, ok: !err, err: err || "" }) }); } catch (e) {} }
  }, 1000);
  // запоминаем страницу, где есть кнопка запуска (для ManyVids/Bonga панель потом открывает её сама)
  if (STREAM) setTimeout(() => {
    if ([...document.querySelectorAll("button,a,[role=button]")].some(b => b.offsetParent !== null && STREAM.test(txt(b))))
      send({ type: "golearn", p: P, url: location.href });
  }, 5000);

  // ── C2C на Bonga (владелец 24.11): он оплатил «посмотреть камеру» → кнопка в её панели → тут жмём его ник → «камера»,
  // его видео выносим маленьким окошком (как пачка сигарет): тянуть за верх, размер — за правый нижний угол, ⧉ — поверх всех окон.
  if (P === "bc") {
    let C2C = null;
    const findNick = who => { const w = who.toLowerCase();
      return [...document.querySelectorAll("a,span,b,div,button")].filter(e => vis(e) && e.children.length <= 1 && (e.innerText || "").trim().toLowerCase().replace(/[:：]$/, "") === w).pop(); };
    const camItem = () => { const l = [...document.querySelectorAll("button,a,[role=button],[role=menuitem],li,div,span")].filter(e => vis(e) && e.children.length <= 2 && (e.innerText || "").length < 40 && /(посмотреть|смотреть|открыть|подключ\S*).{0,12}(камер|веб)|(view|watch|open).{0,10}(cam|webcam)|c2c|cam2cam/i.test(e.innerText || ""));
      const cl = l.filter(e => /^(BUTTON|A)$/.test(e.tagName) || e.getAttribute("role")); return (cl.length ? cl : l).pop(); };   // кнопка/ссылка, самая вложенная
    const herVid = () => { const vs = [...document.querySelectorAll("video")].filter(v => vis(v)); return vs.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0]; };
    function floatBox(src) {
      let box = document.getElementById("aliciaC2C");
      if (!box) {
        box = document.createElement("div"); box.id = "aliciaC2C";
        box.style.cssText = "position:fixed;right:12px;bottom:12px;width:150px;height:230px;min-width:80px;min-height:110px;z-index:2147483647;background:#000;border:2px solid #e0363c;border-radius:8px;overflow:hidden;resize:both;box-shadow:0 4px 16px #000a";
        box.innerHTML = '<div id="aliciaC2Ch" style="position:absolute;top:0;left:0;right:0;height:20px;background:#000a;color:#fff;font:12px Arial;cursor:move;display:flex;align-items:center;gap:6px;padding:0 4px;z-index:2"><span id="aliciaC2Cn" style="flex:1;overflow:hidden;white-space:nowrap"></span><b id="aliciaC2Cp" title="поверх всех окон" style="cursor:pointer">⧉</b><b id="aliciaC2Cx" title="закрыть" style="cursor:pointer">✕</b></div><video id="aliciaC2Cv" autoplay muted playsinline style="width:100%;height:100%;object-fit:cover"></video>';
        document.body.appendChild(box);
        const h = box.querySelector("#aliciaC2Ch"); let d = null;
        h.addEventListener("mousedown", e => { d = { x: e.clientX, y: e.clientY, r: box.getBoundingClientRect() }; e.preventDefault(); });
        addEventListener("mousemove", e => { if (!d) return; box.style.left = (d.r.left + e.clientX - d.x) + "px"; box.style.top = (d.r.top + e.clientY - d.y) + "px"; box.style.right = box.style.bottom = "auto"; });
        addEventListener("mouseup", () => d = null);
        box.querySelector("#aliciaC2Cx").onclick = () => { box.remove(); C2C = null; };
        box.querySelector("#aliciaC2Cp").onclick = () => box.querySelector("video").requestPictureInPicture().catch(e => log("C2C: окно поверх не открылось — " + e.message));
      }
      box.querySelector("#aliciaC2Cn").textContent = "📷 " + (C2C && C2C.who || "");
      const v = box.querySelector("video");
      try { const st = src.srcObject || (src.captureStream ? src.captureStream() : null); if (st && v.srcObject !== st) { v.srcObject = st; v.play().catch(() => {}); } } catch (e) { log("C2C: видео не взялось — " + e.message); }
      v.requestPictureInPicture && v.addEventListener("loadedmetadata", () => v.requestPictureInPicture().catch(() => {}), { once: true });   // если Chrome разрешит — сразу поверх всех окон
    }
    setInterval(async () => {
      if (C2C && Date.now() - C2C.at < 45000) {                            // ждём, когда появится его камера (новое видео, не её)
        if (!C2C.menu) { const it = camItem(); if (it) { it.click(); C2C.menu = 1; log("C2C: нажала «камера» у " + C2C.who); } }
        const her = herVid(), vs = [...document.querySelectorAll("video")].filter(v => vis(v) && v !== her && !v.closest("#aliciaC2C") && !C2C.old.has(v));
        if (vs.length) { floatBox(vs[0]); send({ type: "c2c", p: P, who: C2C.who, ok: true }); log("C2C: камера " + C2C.who + " открыта окошком"); C2C.at = 0; }
        else if (Date.now() - C2C.at > 40000) { send({ type: "c2c", p: P, who: C2C.who, ok: false }); log("C2C: камера " + C2C.who + " не появилась — открой на сайте сама (ник → камера)"); C2C.at = 0; }
        return;
      }
      if (REQ || LC) return;                                             // команды привата/Lovense забирают свои циклы
      try { const c = await (await fetch(PCMD + "&a=c2c", { cache: "no-store" })).json();
        if (c && c.act === "c2c" && c.who) {
          C2C = { who: c.who, at: Date.now(), menu: 0, old: new Set(document.querySelectorAll("video")) };
          const n = findNick(c.who);
          if (n) { n.click(); log("C2C: открыла ник " + c.who); } else log("C2C: ника " + c.who + " не вижу в чате — открой его камеру на сайте сама");
        }
      } catch (e) {}
    }, 1500);
  }
})();
