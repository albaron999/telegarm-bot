require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const userData = {};

// =====================
// 📦 المنتجات (VIP)
// =====================
const products = {
  binance: {
    name: "💸 Binance (USDT)",
    productId: 20498,
    prices: [10, 20, 50, 100]
  },
  pubg: {
    name: "🎮 PUBG UC",
    productId: 12345,
    prices: [5, 10, 25, 50]
  },
  google: {
    name: "🎁 Google Play",
    productId: 54321,
    prices: [10, 25, 50, 100]
  }
};

// =====================
// 👋 START (VIP MENU)
// =====================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
`💎 متجر VIP 👋

💸 /binance
🎮 /pubg
🎁 /google

🏦 /balance`);
});

// =====================
// 💰 BALANCE (وهمي مؤقت)
// =====================
bot.onText(/\/balance/, (msg) => {
  bot.sendMessage(msg.chat.id, "💰 رصيدك: 10$");
});

// =====================
// 📦 عرض المنتجات
// =====================
function showProduct(chatId, key) {
  const product = products[key];

  const keyboard = product.prices.map(p => ([{
    text: `$${p}`,
    callback_data: `${key}_${p}`
  }]));

  bot.sendMessage(chatId, `${product.name}\n\nاختر السعر:`, {
    reply_markup: { inline_keyboard: keyboard }
  });
}

// =====================
// 📦 أوامر المنتجات
// =====================
bot.onText(/\/binance/, (msg) => showProduct(msg.chat.id, "binance"));
bot.onText(/\/pubg/, (msg) => showProduct(msg.chat.id, "pubg"));
bot.onText(/\/google/, (msg) => showProduct(msg.chat.id, "google"));

// =====================
// 🎯 CALLBACK
// =====================
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  const [type, price] = data.split("_");

  if (!products[type]) return;

  userData[chatId] = { type, price };

  bot.sendMessage(chatId,
`🧾 تأكيد الطلب:

📦 المنتج: ${products[type].name}
💰 السعر: ${price}$

هل تريد المتابعة؟`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "✅ تأكيد", callback_data: "confirm" }],
          [{ text: "❌ إلغاء", callback_data: "cancel" }]
        ]
      }
    }
  );
});

// =====================
// ✅ تأكيد / ❌ إلغاء
// =====================
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;

  if (query.data === "confirm") {
    const order = userData[chatId];
    if (!order) return;

    bot.sendMessage(chatId,
`✅ تم الشراء بنجاح!

📦 المنتج: ${products[order.type].name}
💰 السعر: ${order.price}$

🔑 الكود:
XXXX-XXXX-XXXX`
    );

    delete userData[chatId];
  }

  if (query.data === "cancel") {
    delete userData[chatId];
    bot.sendMessage(chatId, "❌ تم الإلغاء");
  }
});
