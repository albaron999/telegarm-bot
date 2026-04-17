const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { polling: true });

// ===== إعداد الأدمن =====
const ADMIN_ID = 1281070961; //  حط ID حقك هنا

// ===== تخزين مؤقت =====
let users = {};
let orders = [];

// ===== جلب توكن Reloadly =====
async function getToken() {
    try {
        const res = await axios.post(
            "https://auth.reloadly.com/oauth/token",
            {
                client_id: process.env.RELOADLY_CLIENT_ID,
                client_secret: process.env.RELOADLY_CLIENT_SECRET,
                grant_type: "client_credentials",
                audience: "https://giftcards.reloadly.com"
            }
        );

        return res.data.access_token;
    } catch (err) {
        console.log("Token Error:", err.response?.data || err.message);
        return null;
    }
}

// ===== بدء =====
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    if (!users[chatId]) {
        users[chatId] = { balance: 0 };
    }

    bot.sendMessage(chatId,
        "متجر VIP\n\n" +
        "/binance\n" +
        "/balance\n" +
        "/admin"
    );
});

// ===== الرصيد الحقيقي =====
bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;

    const token = await getToken();

    if (!token) {
        return bot.sendMessage(chatId, "فشل الاتصال");
    }

    try {
        const res = await axios.get(
            "https://giftcards.reloadly.com/accounts/balance",
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        bot.sendMessage(chatId, "رصيدك: $" + res.data.balance);

    } catch (err) {
        console.log(err.response?.data || err.message);
        bot.sendMessage(chatId, "خطأ في جلب الرصيد");
    }
});

// ===== شراء =====
bot.onText(/\/binance/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "اختر السعر:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "$10", callback_data: "buy_10" }],
                [{ text: "$20", callback_data: "buy_20" }],
                [{ text: "$50", callback_data: "buy_50" }]
            ]
        }
    });
});

// ===== تنفيذ الشراء =====
bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    let amount = 0;

    if (data === "buy_10") amount = 10;
    if (data === "buy_20") amount = 20;
    if (data === "buy_50") amount = 50;

    if (!users[chatId]) users[chatId] = { balance: 0 };

    users[chatId].balance += amount;

    orders.push({
        user: chatId,
        amount: amount,
        time: new Date()
    });

    bot.sendMessage(chatId, "تم شحن $" + amount);
});

// ===== لوحة التحكم =====
bot.onText(/\/admin/, (msg) => {
    const chatId = msg.chat.id;

    if (chatId !== ADMIN_ID) {
        return bot.sendMessage(chatId, "غير مصرح");
    }

    bot.sendMessage(chatId,
        "لوحة التحكم\n\n" +
        "/orders\n" +
        "/add"
    );
});

// ===== عرض الطلبات =====
bot.onText(/\/orders/, (msg) => {
    const chatId = msg.chat.id;

    if (chatId !== ADMIN_ID) {
        return bot.sendMessage(chatId, "غير مصرح");
    }

    if (orders.length === 0) {
        return bot.sendMessage(chatId, "لا يوجد طلبات");
    }

    let text = "الطلبات:\n\n";

    orders.forEach((o, i) => {
        text += `${i + 1}- ID: ${o.user} | $${o.amount}\n`;
    });

    bot.sendMessage(chatId, text);
});

// ===== إضافة رصيد =====
bot.onText(/\/add (.+)/, (msg, match) => {
    const chatId = msg.chat.id;

    if (chatId !== ADMIN_ID) {
        return bot.sendMessage(chatId, "غير مصرح");
    }

    const args = match[1].split(" ");

    const userId = args[0];
    const amount = parseInt(args[1]);

    if (!users[userId]) users[userId] = { balance: 0 };

    users[userId].balance += amount;

    bot.sendMessage(chatId, "تم إضافة $" + amount);
});

console.log("Bot is running...");
