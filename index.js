require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// تخزين بيانات المستخدم
const userData = {};

// =====================
// 🔐 TOKEN
// =====================
async function getGiftToken() {
  try {
    const res = await fetch("https://auth.reloadly.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: process.env.RELOADLY_CLIENT_ID,
        client_secret: process.env.RELOADLY_CLIENT_SECRET,
        grant_type: "client_credentials",
        audience: "https://giftcards.reloadly.com"
      })
    });

    const data = await res.json();

    if (!data.access_token) {
      console.log("TOKEN ERROR:", data);
      return null;
    }

    return data.access_token;

  } catch (err) {
    console.log("AUTH ERROR:", err);

// =====================
// 💸 BINANCE FIX (FINAL)
// =====================
bot.onText(/\/binance/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const token = await getGiftToken();

    const res = await fetch("https://giftcards.reloadly.com/products/20498", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const product = await res.json();

    if (!product || !product.productName) {
      return bot.sendMessage(chatId, "❌ Binance غير متوفر");
    }

    const prices = product.fixedRecipientDenominations;

    const keyboard = prices.map(p => ([{
      text: `$${p}`,
      callback_data: `buy_${product.productId}_${p}_${product.productName}`
    }]));

    bot.sendMessage(chatId,
      `💸 ${product.productName}\nاختر السعر:`,
      { reply_markup: { inline_keyboard: keyboard } }
    );

  } catch (err) {
    console.log(err);
    bot.sendMessage(chatId, "❌ خطأ في Binance");
  }
});
    return null;
  }
}

// =====================
// 💰 BALANCE
// =====================
async function getBalance() {
  try {
    const token = await getGiftToken();
    if (!token) return null;

    const res = await fetch("https://giftcards.reloadly.com/accounts/balance", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    return data.balance;

  } catch (err) {
    console.log("BALANCE ERROR:", err);
    return null;
  }
}

// =====================
// 🔍 GET PRODUCT
// =====================
async function getProductByName(name) {
  try {
    const token = await getGiftToken();

    const res = await fetch("https://giftcards.reloadly.com/products", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!Array.isArray(data)) {
      console.log("API ERROR:", data);
      return null;
    }

    return data.find(p =>
      p.productName.toLowerCase().includes(name.toLowerCase())
    );

  } catch (err) {
    console.log("PRODUCT ERROR:", err);
    return null;
  }
}

// =====================
// 💵 GET PRICES
// =====================
async function getProductPrices(productId) {
  try {
    const token = await getGiftToken();

    const res = await fetch(`https://giftcards.reloadly.com/products/${productId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();

    if (!data || !data.fixedRecipientDenominations) return [];

    return data.fixedRecipientDenominations;

  } catch (err) {
    console.log("PRICE ERROR:", err);
    return [];
  }
}

// =====================
// 🛒 BUY
// =====================
async function buyCard(user, chatId) {
  try {
    const token = await getGiftToken();

    const res = await fetch("https://giftcards.reloadly.com/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        productId: user.productId,
        countryCode: "US",
        quantity: 1,
        unitPrice: user.price,
        senderName: user.sender,
        recipientName: user.sender,
        recipientEmail: user.email,
        customIdentifier: "order_" + Date.now()
      })
    });

    const data = await res.json();

    console.log("ORDER:", data);

    if (data.errorCode) {
      return bot.sendMessage(chatId, "❌ فشل الشراء:\n" + data.message);
    }

    bot.sendMessage(chatId,
      "✅ تم الشراء بنجاح 🎉\n\n" +
      "📦 الكود:\n" + data.redemptionCode
    );

  } catch (err) {
    console.log(err);
    bot.sendMessage(chatId, "❌ خطأ في الشراء");
  }
}

// =====================
// 📦 SEND PRODUCT
// =====================
async function sendProduct(msg, name) {
  const chatId = msg.chat.id;

  const product = await getProductByName(name);

  if (!product) {
    return bot.sendMessage(chatId, "❌ المنتج غير موجود");
  }

  const prices = await getProductPrices(product.productId);

  if (!prices.length) {
    return bot.sendMessage(chatId, "❌ لا توجد أسعار");
  }

  const keyboard = prices.map(p => ([{
    text: `$${p}`,
    callback_data: `buy_${product.productId}_${p}_${product.productName}`
  }]));

  bot.sendMessage(chatId,
    `💳 ${product.productName}\nاختر السعر:`,
    { reply_markup: { inline_keyboard: keyboard } }
  );
}

// =====================
// 👋 START
// =====================
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    "💎 متجر VIP\n\n" +
    "💸 /binance\n" +
    "🎮 /pubg\n" +
    "🎁 /google\n\n" +
    "🏦 /balance"
  );
});

// =====================
// COMMANDS
// =====================
bot.onText(/\/pubg/, (msg) => sendProduct(msg, "pubg"));
bot.onText(/\/google/, (msg) => sendProduct(msg, "google play"));
bot.onText(/\/binance/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const token = await getGiftToken();

    const res = await fetch("https://giftcards.reloadly.com/products/20498", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const product = await res.json();

    if (!product || !product.productName) {
      return bot.sendMessage(chatId, "❌ Binance غير متوفر");
    }

    let prices = product.fixedRecipientDenominations;

if (!prices || prices.length === 0) {
  // fallback لو ما رجع أسعار
  prices = [10, 20, 50, 100, 200, 500];
}

    const keyboard = prices.map(p => ([{
      text: `$${p}`,
      callback_data: `buy_${product.productId}_${p}_${product.productName}`
    }]));

    bot.sendMessage(chatId,
      `💸 ${product.productName}\nاختر السعر:`,
      { reply_markup: { inline_keyboard: keyboard } }
    );

  } catch (err) {
    console.log(err);
    bot.sendMessage(chatId, "❌ خطأ في Binance");
  }
});
// =====================
// BALANCE
// =====================
bot.onText(/\/balance/, async (msg) => {
  const balance = await getBalance();

  if (balance === null) {
    return bot.sendMessage(msg.chat.id, "❌ فشل جلب الرصيد");
  }

  bot.sendMessage(msg.chat.id, `💰 رصيدك: ${balance}$`);
});

// =====================
// CALLBACK
// =====================
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // اختيار السعر
  if (data.startsWith("buy_")) {
    const parts = data.split("_");

    userData[chatId] = {
      productId: parts[1],
      price: parseInt(parts[2]),
      name: parts.slice(3).join("_")
    };

    return bot.sendMessage(chatId, "📧 ارسل ايميل المستلم:");
  }

  // تأكيد
  if (data === "confirm") {
    const user = userData[chatId];

    bot.sendMessage(chatId, "⏳ جاري التحقق من الرصيد...");

    const balance = await getBalance();

    if (balance < user.price) {
      delete userData[chatId];

      return bot.sendMessage(chatId,
        `❌ رصيدك غير كافي\nرصيدك: ${balance}$`
      );
    }

    await buyCard(user, chatId);

    delete userData[chatId];
  }

  // إلغاء
  if (data === "cancel") {
    delete userData[chatId];
    bot.sendMessage(chatId, "❌ تم الإلغاء");
  }
});

// =====================
// INPUT
// =====================
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (!userData[chatId]) return;

  const user = userData[chatId];

  if (!user.email) {
    user.email = msg.text;
    return bot.sendMessage(chatId, "👤 ارسل اسم المرسل:");
  }

  if (!user.sender) {
    user.sender = msg.text;

    return bot.sendMessage(chatId,
      `🧾 تأكيد الطلب:\n\n` +
      `💳 ${user.name}\n` +
      `💰 ${user.price}$\n` +
      `📧 ${user.email}\n` +
      `👤 ${user.sender}\n\n` +
      `هل تريد المتابعة؟`,
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