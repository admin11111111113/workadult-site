async (a) => {
  // 25.11: прямой ввод текста в ОБЩИЙ чат эфира (хаб/панель вызывают через помощника exec) — без постоянного скрипта на странице
  const P = a.p, text = a.text;
  const SAYIN = /message|сообщ|chat|чат|type|напиши|say|tin nhắn|comment|write/i;
  const vis = e => e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden" && !e.disabled && !/disabled/i.test(e.className || "") && e.getAttribute("aria-disabled") !== "true";
  const txt = e => (e.innerText || e.value || "").replace(/[^\p{L}\p{N} ]+/gu, " ").replace(/\s+/g, " ").trim();
  const ph = e => (e.placeholder || "") + (e.getAttribute("aria-label") || "") + (e.getAttribute("data-placeholder") || "");
  const el = [...document.querySelectorAll("textarea,input[type=text],input:not([type]),[contenteditable=true],[contenteditable='']")]
    .filter(e => e.getClientRects().length && !e.disabled && !e.readOnly && !/search|поиск|tìm|приват|private|личн/i.test(ph(e) + (e.name || ""))
      && (P !== "sc" || !!e.closest(".model-chat-public")) && !((l => l && l !== document.documentElement && l !== document.body)(e.closest("[class*=lvs-]")))
      && !e.closest("[class*=messenger i],[class*=conversation i],[class*=private-message i],[class*=pm-chat i],[class*=dialog i],[class*=popup i],[class*=float i],[class*=modal i],[role=dialog],.bm_im_float_dialog,[class*=bm_im]"))
    .sort((x, y) => (SAYIN.test(ph(y)) ? 1 : 0) - (SAYIN.test(ph(x)) ? 1 : 0) || y.getBoundingClientRect().bottom - x.getBoundingClientRect().bottom)[0];
  if (!el) return { ok: false, err: "не нашла поле чата на странице" };
  el.focus();
  if (el.isContentEditable) { document.execCommand("selectAll", false); document.execCommand("insertText", false, text); }
  else { const set = Object.getOwnPropertyDescriptor(el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, "value").set;
    set.call(el, text); el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
  await new Promise(r => setTimeout(r, 300));
  let box = el, btn = null;
  for (let i = 0; i < 5 && box.parentElement && !btn; i++) { box = box.parentElement;
    btn = [...box.querySelectorAll("button,[role=button]")].find(b => vis(b) && (/^(send|отправить|gửi|say|post)$/i.test(txt(b)) || /send|отправ|submit/i.test((b.getAttribute("aria-label") || "") + (b.title || "") + (b.className || "")))); }
  if (btn) btn.click();
  else for (const t of ["keydown", "keypress", "keyup"]) el.dispatchEvent(new KeyboardEvent(t, { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
  await new Promise(r => setTimeout(r, 700));
  const left = el.isContentEditable ? el.innerText.trim() : el.value.trim();
  return left && left === text.trim() ? { ok: false, err: "текст в поле, но не ушёл — нажми Enter на сайте" } : { ok: true };
}
