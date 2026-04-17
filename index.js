require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const ADMIN_ID = 123456789; // 👈 ضع ايديك

const userState = {};
const orders = [];

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
// 💰 رصيد حقيقي
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

💸 /binance
🏦 /balance
👑 /admin`
  );
});

// =====================
// 💰 BALANCE
// =====================
bot.onText(/\/balance/, async (msg) => {
  const balance = await getBalance();
  bot.sendMessage(msg.chat.id, `💰 رصيد المتجر: ${balance}$`);
});

// =====================
// 💸 BINANCE
// =====================
bot.onText(/\/binance/, async (msg) => {
  const chatId = msg.chat.id;

  const prices = [10, 20, 50, 100];

  const keyboard = prices.map(p => ([{
    text: `$${p}`,
    callback_data: `buy_${p}`
  }]));

  bot.sendMessage(chatId, "💸 اختر السعر:", {
    reply_markup: { inline_keyboard: keyboard }
  });
});

// =====================
// 🎯 CALLBACK
// =====================
bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const data = q.data;

  // اختيار السعر
  if (data.startsWith("buy_")) {
    const price = parseInt(data.split("_")[1]);

    userState[chatId] = { price };

    return bot.sendMessage(chatId, "📧 ارسل الايميل:");
  }

  // تأكيد
  if (data === "confirm") {
    const user = userState[chatId];
    if (!user) return;

    const balance = await getBalance();

    if (balance < user.price) {
      return bot.sendMessage(chatId, "❌ رصيد المتجر غير كافي");
    }

    const token = await getToken();

    const res = await fetch("https://giftcards.reloadly.com/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        productId: 20498,
        countryCode: "US",
        quantity: 1,
        unitPrice: user.price,
        senderName: "VIP Bot",
        recipientEmail: user.email
      })
    });

    const result = await res.json();

    orders.push({
      user: chatId,
      price: user.price,
      date: new Date()
    });

    delete userState[chatId];

    if (result.status === "SUCCESSFUL") {
      const code = result.vouchers?.[0]?.code;

      return bot.sendMessage(chatId,
        `✅ تم الشراء\n\n💰 ${user.price}$\n\n${code || "📧 تم الإرسال للإيميل"}`
      );
    }

    bot.sendMessage(chatId, "❌ فشل الشراء");
  }

  // إلغاء
  if (data === "cancel") {
    delete userState[chatId];
    bot.sendMessage(chatId, "❌ تم الإلغاء");
  }
});

// =====================
// 📩 الرسائل
// =====================
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (!userState[chatId]) return;

  if (!userState[chatId].email) {
    userState[chatId].email = msg.text;

    return bot.sendMessage(chatId,
      `🧾 تأكيد الطلب:\n💰 ${userState[chatId].price}$`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ تأكيد", callback_data: "confirm" }],
            [{ text: "❌ إلغاء", callback_data: "cancel" }]
          ]
        }
      }
    );
  }
});

// =====================
// 👑 ADMIN PANEL
// =====================
bot.onText(/\/admin/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,
`👑 لوحة التحكم

/orders
/users`);
});

// =====================
// 📊 ORDERS
// =====================
bot.onText(/\/orders/, (msg) => {
  if (msg.from.id !== ADMIN_ID) return;

  if (orders.length === 0) {
    return bot.sendMessage(msg.chat.id, "لا يوجد طلبات");
  }

  const list = orders.map(o =>
    `👤 ${o.user} | 💰 ${o.price}$`
  ).join("\n");

  bot.sendMessage(msg.chat.id, list);
});
