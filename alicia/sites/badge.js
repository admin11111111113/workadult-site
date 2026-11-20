// Плавающий значок на страницах эфира (CB / SC / Bonga): клик → кнопки по кругу.
// 🔗 Ссылка управления (окно Lovense), 📳 Тест игрушки, 📋 Панель. Команды уходят в панель workadult.pro/alicia.
(() => {
  if (window.__aliciaBadge || window.top !== window) return; window.__aliciaBadge = 1;
  const send = m => { try { chrome.runtime.sendMessage(m); } catch (e) {} };
  const BTN = [
    { act: "link", ico: "🔗", tip: "Ссылка управления", c: "#2ecc71" },
    { act: "test", ico: "📳", tip: "Тест игрушки", c: "#ff3d8b" },
    { act: "panel", ico: "📋", tip: "Панель", c: "#5b7cff" },
  ];
  const host = document.createElement("div");
  const sh = host.attachShadow({ mode: "open" });
  const pos = JSON.parse(localStorage.aliciaBadgePos || "null") || { x: innerWidth - 110, y: innerHeight - 160 };
  sh.innerHTML = `<style>
  .w{position:fixed;z-index:2147483647;width:64px;height:64px;font:600 13px Segoe UI,Arial}
  .m{position:absolute;inset:0;border-radius:16px;background:#8a5cff;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;
     cursor:grab;box-shadow:0 4px 14px #0007;user-select:none;font-size:26px;line-height:1}.m small{font-size:10px;margin-top:2px}
  .b{position:absolute;left:10px;top:10px;width:44px;height:44px;border-radius:50%;color:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;
     cursor:pointer;opacity:0;pointer-events:none;transition:transform .18s,opacity .18s;box-shadow:0 3px 10px #0006}
  .open .b{opacity:1;pointer-events:auto}
  .b span{position:absolute;white-space:nowrap;background:#111d;color:#fff;font-size:12px;padding:2px 6px;border-radius:6px;bottom:-20px;display:none}.b:hover span{display:block}
  .t{position:absolute;right:72px;top:16px;white-space:nowrap;background:#111e;color:#fff;padding:6px 10px;border-radius:8px;display:none}
  </style><div class="w"><div class="t"></div>${BTN.map((b, i) => `<div class="b" data-a="${b.act}" style="background:${b.c}">${b.ico}<span>${b.tip}</span></div>`).join("")}<div class="m">💋<small>Алисия</small></div></div>`;
  const w = sh.querySelector(".w"), m = sh.querySelector(".m"), toast = sh.querySelector(".t");
  const place = () => { pos.x = Math.min(Math.max(pos.x, 70), innerWidth - 70); pos.y = Math.min(Math.max(pos.y, 70), innerHeight - 70); w.style.left = pos.x + "px"; w.style.top = pos.y + "px"; };
  place(); addEventListener("resize", place);
  const R = 72, ang = [200, 250, 300];          // веер вверх-влево
  function toggle(open) {
    w.classList.toggle("open", open);
    sh.querySelectorAll(".b").forEach((b, i) => { const a = ang[i] * Math.PI / 180;
      b.style.transform = open ? `translate(${Math.cos(a) * R}px,${Math.sin(a) * R}px)` : "none"; });
  }
  function say(t) { toast.textContent = t; toast.style.display = "block"; clearTimeout(say.k); say.k = setTimeout(() => toast.style.display = "none", 2500); }
  let drag = null;
  m.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y, moved: false }; m.setPointerCapture(e.pointerId); });
  m.addEventListener("pointermove", e => { if (!drag) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true; if (drag.moved) { pos.x = drag.px + dx; pos.y = drag.py + dy; place(); } });
  m.addEventListener("pointerup", () => { if (drag && !drag.moved) toggle(!w.classList.contains("open")); else localStorage.aliciaBadgePos = JSON.stringify(pos); drag = null; });
  const PLAT = /chaturbate/.test(location.hostname) ? "chaturbate" : /stripchat/.test(location.hostname) ? "stripchat"
    : /bonga/.test(location.hostname) ? "bongacams" : /manyvids/.test(location.hostname) ? "manyvids" : "";
  // окно выбора времени и готовой ссылки
  const box = document.createElement("div"); box.className = "x"; w.appendChild(box);
  sh.querySelector("style").textContent += `.x{position:absolute;right:72px;bottom:0;background:#1f2230;color:#fff;border-radius:12px;padding:10px;display:none;width:250px;box-shadow:0 4px 14px #0008}
   .x b{display:block;margin-bottom:6px}.x button{font:inherit;border:0;border-radius:8px;padding:6px 10px;margin:3px;cursor:pointer;background:#2ecc71;color:#fff}
   .x input{width:100%;box-sizing:border-box;font:12px monospace;padding:6px;border-radius:6px;border:0;margin:6px 0}`;
  const show = h => { box.innerHTML = h + `<button data-z="0" style="background:#444">✕</button>`; box.style.display = "block"; };
  box.addEventListener("click", async e => {
    const t = e.target; if (!t.dataset) return;
    if (t.dataset.z) box.style.display = "none";
    if (t.dataset.min) {
      send({ type: "badge", act: "link", min: +t.dataset.min, platform: PLAT, site: location.hostname });
      show("<b>⏳ Делаю ссылку на " + t.dataset.min + " мин…</b>");
      for (let i = 0; i < 40; i++) {
        await new Promise(r => setTimeout(r, 1000));
        let r = null; try { r = await chrome.runtime.sendMessage({ type: "poll", ch: "badge" }); } catch (x) {}
        if (r && r.type === "clink") {
          if (r.url) show(`<b>🔗 Ссылка на ${r.min} мин готова</b><input readonly value="${r.url}"><button data-copy="1">Скопировать</button>`);
          else show("<b>⚠️ " + (r.err || "не вышло") + "</b>");
          return;
        }
      }
      show("<b>⚠️ Нет ответа. Панель открыта? Lovense запущен?</b>");
    }
    if (t.dataset.copy) { const i = box.querySelector("input"); i.select(); try { await navigator.clipboard.writeText(i.value); } catch (x) { document.execCommand("copy"); } t.textContent = "Скопировано ✅"; }
  });
  sh.querySelectorAll(".b").forEach(b => b.addEventListener("click", () => {
    const a = b.dataset.a; toggle(false);
    if (a === "link") return show("<b>🔗 Ссылка управления — на сколько?</b>" + [1, 3, 5, 10, 15].map(m => `<button data-min="${m}">${m} мин</button>`).join(""));
    send({ type: "badge", act: a, site: location.hostname });
    say(a === "test" ? "Вибрирую…" : "Открываю панель");
  }));
  (document.body || document.documentElement).appendChild(host);
})();
