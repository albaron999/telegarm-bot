require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const users = {};

// =====================
// 📦 المنتجات
// =====================
const products = {
  binance: { name: "💸 Binance", prices: [10, 20, 50] },
  pubg: { name: "🎮 PUBG", prices: [5, 10, 25] },
  google: { name: "🎁 Google Play", prices: [10, 25, 50] }
};

// =====================
// 👤 إنشاء مستخدم
// =====================
function getUser(id) {
  if (!users[id]) {
    users[id] = { balance: 0 };
  }
  return users[id];
}

// =====================
// 👋 START
// =====================
bot.onText(/\/start/, (msg) => {
  getUser(msg.chat.id);

  bot.sendMessage(msg.chat.id,
`💎 متجر VIP 👋

💸 /binance
🎮 /pubg
🎁 /google

💰 /balance`);
});

// =====================
// 💰 الرصيد
// =====================
bot.onText(/\/balance/, (msg) => {
  const user = getUser(msg.chat.id);
  bot.sendMessage(msg.chat.id, `💰 رصيدك: ${user.balance}$`);
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
// 📦 أوامر
// =====================
bot.onText(/\/binance/, (msg) => showProduct(msg.chat.id, "binance"));
bot.onText(/\/pubg/, (msg) => showProduct(msg.chat.id, "pubg"));
bot.onText(/\/google/, (msg) => showProduct(msg.chat.id, "google"));

// =====================
// 🎯 شراء
// =====================
bot.on("callback_query", (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  const [type, price] = data.split("_");

  if (!products[type]) return;

  const user = getUser(chatId);

  if (user.balance < price) {
    return bot.sendMessage(chatId,
      `❌ رصيدك غير كافي\nرصيدك: ${user.balance}$`
    );
  }

  user.balance -= price;

  bot.sendMessage(chatId,
`✅ تم الشراء!

📦 ${products[type].name}
💰 ${price}$

🔑 الكود:
XXXX-XXXX-XXXX`
  );
});

// =====================
// 👑 أمر سري لك (شحن)
// =====================
bot.onText(/\/add (.+)/, (msg, match) => {
  const adminId = 1281070961; // 👈 ضع ايديك هنا

  if (msg.from.id !== adminId) return;

  const [userId, amount] = match[1].split(" ");

  if (!users[userId]) users[userId] = { balance: 0 };

  users[userId].balance += parseInt(amount);

  bot.sendMessage(msg.chat.id, "✅ تم شحن المستخدم");
});
