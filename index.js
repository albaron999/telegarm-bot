require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const userData = {};

// =====================
// 🛒 المنتجات (VIP)
// =====================
const products = {
  binance: {
    name: "Binance (USDT)",
    productId: 20498,
    prices: [10, 20, 50, 100, 200, 500]
  },
  pubg: {
    name: "PUBG UC",
    productId: 12345, // غيره لاحقاً
    prices: [10, 25, 50, 100]
  },
  google: {
    name: "Google Play",
    productId: 54321, // غيره لاحقاً
    prices: [10, 25, 50, 100]
  }
};

// =====================
// 🔐 TOKEN
// =====================
async function getToken() {
  const res = await fetch("https://auth.reloadly.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.RELOADLY_CLIENT_ID,
      client_secret: process.env.RELOADLY_CLIENT_SECRET,
      grant_type: "client_credentials",
      audience: "https://giftcards.reloadly.com"
    })
  });

  const data = await res.json();
  return data.access_token;
}

// =====================
// 💰 BALANCE
// =====================
async function getBalance() {
  try {
    const token = await getToken();

    const res = await fetch("https://giftcards.reloadly.com/accounts/balance", {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    return data.balance;

  } catch {
    return null;
  }
}

// =====================
// 👋 START
// =====================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`💎 متجر VIP

🎁 اختر الخدمة:
/binance
/pubg
/google

🏦 /balance عرض الرصيد`
  );
});

// =====================
// 💰 BALANCE
// =====================
bot.onText(/\/balance/, async (msg) => {
  const balance = await getBalance();
  bot.sendMessage(msg.chat.id, `💰 رصيدك: ${balance}$`);
});

// =====================
// 📦 عرض منتج
// =====================
function showProduct(chatId, key) {
  const product = products[key];

  if (!product) {
    return bot.sendMessage(chatId, "❌ المنتج غير موجود");
  }

  const keyboard = product.prices.map(p => ([{
    text: `$${p}`,
    callback_data: `${key}_${p}`
  }]));

  bot.sendMessage(chatId,
    `💳 ${product.name}\nاختر السعر:`,
    { reply_markup: { inline_keyboard: keyboard } }
  );
}

// =====================
// 📌 أوامر المنتجات
// =====================
bot.onText(/\/binance/, (msg) => showProduct(msg.chat.id, "binance"));
bot.onText(/\/pubg/, (msg) => showProduct(msg.chat.id, "pubg"));
bot.onText(/\/google/, (msg) => showProduct(msg.chat.id, "google"));

// =====================
// 🎯 CALLBACK
// =====================
bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const data = q.data;

  // اختيار السعر
  if (data.includes("_")) {
    const [productKey, priceRaw] = data.split("_");
    const price = parseInt(priceRaw);

    userData[chatId] = {
      productKey,
      price: price + 2 // 💰 ربحك
    };

    return bot.sendMessage(chatId, "📧 ارسل ايميل المستلم:");
  }

  // تأكيد
  if (data === "confirm") {
    const user = userData[chatId];
    if (!user) return;

    const { productKey, price, email, sender } = user;
    const product = products[productKey];

    bot.sendMessage(chatId, "⏳ جاري الشراء...");

    const balance = await getBalance();

    if (balance < price) {
      delete userData[chatId];
      return bot.sendMessage(chatId, "❌ ر
