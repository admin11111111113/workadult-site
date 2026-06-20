// Backend URL — токены хранятся безопасно на сервере
const BACKEND = "https://workadult-orders.onrender.com";

// Подпись источника: с какой страницы пришло сообщение
function srcTag() {
  var path = location.pathname || "/";
  var map = {
    "/": "Главная страница",
    "/index.html": "Главная страница",
    "/anketa.html": "Работа (анкета модели)",
    "/vopros.html": "Поддержка / Вопрос",
    "/vakansii.html": "Вакансии / Доска"
  };
  var name = map[path] || ((document.title || "").split("|")[0].trim() || "Сайт");
  return "\n\n━━━━━━━━━━━━━━━━\n📍 Источник: <b>" + name + "</b>\n🔗 " + location.host + path;
}


async function sendToTelegram(type, text) {
  try {
    const resp = await fetch(`${BACKEND}/send`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({type, text})
    });
    return resp.ok;
  } catch(e) { return false; }
}

// Одна форма — всё в одном сообщении
async function submitOrder(event) {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Отправляем...";

  const data = Object.fromEntries(new FormData(form));
  const product = document.getElementById("orderProductLabel").textContent || "Заказ";

  const text =
    `📦 <b>НОВЫЙ ЗАКАЗ</b>\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `🎯 Тариф: <b>${product}</b>\n\n` +
    `💬 Chaturbate: ${data.chaturbate || "—"}\n` +
    `💬 Stripchat: ${data.stripchat || "—"}\n` +
    `📱 Telegram: ${data.telegram}\n` +
    `📅 Дата: ${data.date}\n` +
    `🕐 Время (МСК): ${data.time}\n\n` +
    `━━━━━━━━━━━━━━━━\n` +
    `💰 Сумма оплаты: ${data.amount} USDT\n` +
    `🔗 TxID: <code>${data.txid}</code>` + srcTag();

  // Передаём txid и amount для проверки блокчейна
  const payload = {type: "order", text, txid: data.txid || "", amount: data.amount || "0"};
  const resp = await fetch(`${BACKEND}/send`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });
  const ok = resp.ok;
  btn.disabled = false; btn.textContent = "Отправить заказ";

  if (ok) {
    form.reset();
    document.getElementById("orderProductLabel").textContent = "";
    document.getElementById("order-form").querySelector(".form-success").style.display = "block";
    setTimeout(() => {
      document.getElementById("order-form").querySelector(".form-success").style.display = "none";
    }, 6000);
  } else {
    alert("Ошибка. Напишите напрямую: @workadultpro");
  }
}

// Анкета модели
async function submitAnketa(event) {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Отправляем...";
  const data = Object.fromEntries(new FormData(form));
  const text = `👤 <b>НОВАЯ АНКЕТА МОДЕЛИ</b>\n\n` +
    `📱 Telegram: ${data.telegram}\n` +
    `🌍 Страна: ${data.country || "—"}\n` +
    `💬 Опыт: ${data.experience || "—"}\n` +
    `📝 Примечание: ${data.note || "—"}` + srcTag();
  const ok = await sendToTelegram("feedback", text);
  btn.disabled = false; btn.textContent = "Отправить анкету";
  if (ok) { form.reset(); form.nextElementSibling.style.display = "block"; }
  else alert("Ошибка. Напишите: @workadultpro");
}

// Вопрос/поддержка
async function submitQuestion(event) {
  event.preventDefault();
  const form = event.target;
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.textContent = "Отправляем...";
  const data = Object.fromEntries(new FormData(form));
  const text = `❓ <b>ВОПРОС / ПОДДЕРЖКА</b>\n\n` +
    `👤 Имя: ${data.name || "—"}\n` +
    `📱 Telegram: ${data.telegram}\n` +
    `💬 Вопрос: ${data.question}` + srcTag();
  const ok = await sendToTelegram("feedback", text);
  btn.disabled = false; btn.textContent = "Отправить";
  if (ok) { form.reset(); form.nextElementSibling.style.display = "block"; }
  else alert("Ошибка. Напишите: @workadultpro");
}

// Кнопки тарифов
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".order-btn").forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      const product = btn.dataset.product;
      document.getElementById("orderProductLabel").textContent = product;
      // Обновляем сумму в поле
      const priceMatch = product.match(/\$(\d+)/);
      if (priceMatch) {
        document.querySelector("#orderForm [name=amount]").value = priceMatch[1];
      }
      document.getElementById("order-form").scrollIntoView({behavior: "smooth"});
    });
  });

  // Бургер меню
  const burger = document.querySelector(".burger");
  const navLinks = document.querySelector(".nav-links");
  if (burger && navLinks) {
    burger.addEventListener("click", () => navLinks.classList.toggle("open"));
  }

  // Видео-фон героя: половинная скорость + плавное появление, откат на Ken Burns при сбое
  const hv = document.getElementById("heroVideo");
  if (hv) {
    const slow = () => { try { hv.playbackRate = 0.5; } catch (e) {} };
    hv.addEventListener("loadedmetadata", slow);
    hv.addEventListener("loadeddata", () => { slow(); hv.classList.add("playing"); });
    hv.addEventListener("play", slow);
    slow();
    const src = hv.querySelector("source");
    if (src) src.addEventListener("error", () => { hv.style.display = "none"; });
  }
});
