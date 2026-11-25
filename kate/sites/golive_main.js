// MAIN-мир, document_start: пока идёт автозапуск эфира (sessionStorage.aliciaGo), системные окошки confirm/alert
// сайта («подтвердите, что вы модель» и т.п.) сами отвечают «ОК».
(() => {
  const on = () => +(sessionStorage.aliciaGo || 0) > Date.now();
  const c = window.confirm, a = window.alert;
  window.confirm = function (m) { return on() ? true : c.apply(this, arguments); };
  window.alert = function (m) { return on() ? undefined : a.apply(this, arguments); };
})();
