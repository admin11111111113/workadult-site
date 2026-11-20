// Страница настроек Lovense Cam Extension: сколько сайтов добавлено (нужны Chaturbate, Stripchat, Bongacams, ManyVids).
(() => {
  if (window.__aliciaLV) return; window.__aliciaLV = 1;
  const tick = () => {
    const t = document.body.innerText || "", m = /(Мои Вебкам-сайты|My Cam Sites|My Webcam Sites)\s*\((\d+)\)/i.exec(t);
    if (m) chrome.runtime.sendMessage({ type: "lovsites", n: +m[2], text: t.slice(t.indexOf(m[0]), t.indexOf(m[0]) + 400) });
  };
  setTimeout(tick, 3000); setInterval(tick, 10000);
})();
