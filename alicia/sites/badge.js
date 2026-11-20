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
  sh.querySelectorAll(".b").forEach(b => b.addEventListener("click", () => {
    const a = b.dataset.a; send({ type: "badge", act: a, site: location.hostname });
    say(a === "test" ? "Вибрирую…" : a === "link" ? "Открываю Lovense → «Ссылка управления»" : "Открываю панель"); toggle(false);
  }));
  (document.body || document.documentElement).appendChild(host);
})();
