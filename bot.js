const ORDER_BOT_TOKEN = "8874558070:AAFMJG4sm1tdw8JZJPpEH28vh7s7ovdfCvs";
const FEEDBACK_BOT_TOKEN = "8543871731:AAFeNvBtPTg1H_N9gduzlRRedmlUlSFhrcs";
const OWNER_ID = "7132111685";

async function sendToTelegram(token, text) {
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({chat_id: OWNER_ID, text, parse_mode: "HTML"})
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
    `🔗 TxID: <code>${data.txid}</code>`;

  const ok = await sendToTelegram(ORDER_BOT_TOKEN, text);
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
    `📝 Примечание: ${data.note || "—"}`;
  const ok = await sendToTelegram(FEEDBACK_BOT_TOKEN, text);
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
    `💬 Вопрос: ${data.question}`;
  const ok = await sendToTelegram(FEEDBACK_BOT_TOKEN, text);
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
});
