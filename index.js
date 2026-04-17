require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const ADMIN_ID = 1281070961; // حط ايديك

const users = {};
const userState = {};
const orders = [];

// =====================
// 👤 المستخدم
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
`💎 متجر VIP

💸 /binance
💰 /balance
👑 /admin`);
});

// =====================
// 💰 الرصيد
// =====================
bot.onText(/\/balance/, (msg) => {
  const user = getUser(msg.chat.id);
  bot.sendMessage(msg.chat.id, `💰 رصيدك: ${user.balance}$`);
});

// =====================
// 💸 BINANCE
// =====================
bot.onText(/\/binance/, (msg) => {
  const prices = [10, 20, 50];

  const keyboard = prices.map(p => ([{
    text: `$${p}`,
    callback_data: `buy_${p}`
  }]));

  bot.sendMessage(msg.chat.id, "💸 اختر السعر:", {
    reply_markup: { inline_keyboard: keyboard }
  });
});

// =====================
// 🎯 CALLBACK
// =====================
bot.on("callback_query", (q) => {
  const chatId = q.message.chat.id;
  const data = q.data;

  if (data.startsWith("buy_")) {
    const price = parseInt(data.split("_")[1]);

    userState[chatId] = { price };

    return bot.sendMessage(chatId,
`🧾 تأكيد الطلب:

💰 السعر: ${price}$`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "تأكيد", callback_data: "confirm" }],
            [{ text: "إلغاء", callback_data: "cancel" }]
          ]
        }
      }
    );
  }

  if (data === "confirm") {
    const state = userState[chatId];
    if (!state) return;

    const user = getUser(chatId);

    if (user.balance < state.price) {
      return bot.sendMessage(chatId, "رصيدك غير كافي");
    }

    user.balance -= state.price;

    orders.push({
      user: chatId,
      price: state.price
    });

    delete userState[chatId];

    bot.sendMessage(chatId,
`تم الشراء بنجاح

💰 ${state.price}$

الكود:
XXXX-XXXX`);
  }

  if (data === "cancel") {
    delete userState[chatId];
    bot.sendMessage(chatId, "تم الإلغاء");
  }
});

// =====================
// 👑 ADMIN
// =====================
bot.onText(/\/admin/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,
`لوحة التحكم

/orders
/add`);
});

// =====================
// 📊 الطلبات
// =====================
bot.onText(/\/orders/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;

  if (orders.length === 0) {
    return bot.sendMessage(msg.chat.id, "لا يوجد طلبات");
  }

  const list = orders.map(o =>
    `ID: ${o.user} | ${o.price}$`
  ).join("\n");

  bot.sendMessage(msg.chat.id, list);
});

// =====================
// 💰 شحن
// =====================
bot.onText(/\/add (.+)/, (msg, match) => {
  if (msg.from.id !== ADMIN_ID) return;

  const [id, amount] = match[1].split(" ");

  const user = getUser(id);
  user.balance += parseInt(amount);

  bot.sendMessage(msg.chat.id, "تم الشحن");
});
