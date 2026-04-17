const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// 🔐 بيانات Reloadly
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

let accessToken = "";

// جلب توكن
async function getToken() {
    const res = await axios.post("https://auth.reloadly.com/oauth/token", {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "client_credentials",
        audience: "https://topups.reloadly.com"
    });

    accessToken = res.data.access_token;
}

// جلب الرصيد الحقيقي
async function getBalance() {
    const res = await axios.get("https://topups.reloadly.com/accounts/balance", {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    return res.data.balance;
}

// تخزين طلبات فقط
let orders = [];

// 🔹 start
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, `
👋 متجر VIP

💳 /binance
💰 /balance (حقيقي)
👑 /admin
    `);
});

// 💰 رصيد حقيقي من Reloadly
bot.onText(/\/balance/, async (msg) => {
    try {
        await getToken();
        const balance = await getBalance();

        bot.sendMessage(msg.chat.id, `💰 رصيدك الحقيقي: $${balance}`);
    } catch (err) {
        console.log(err.response?.data || err.message);
        bot.sendMessage(msg.chat.id, "❌ خطأ في جلب الرصيد");
    }
});

// 💳 شراء (واجهة فقط حالياً)
bot.onText(/\/binance/, (msg) => {
    bot.sendMessage(msg.chat.id, "اختر السعر:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "$10", callback_data: "buy_10" }],
                [{ text: "$20", callback_data: "buy_20" }],
                [{ text: "$50", callback_data: "buy_50" }]
            ]
        }
    });
});

// الضغط على الأزرار (يسجل طلب فقط)
bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    let amount = 0;

    if (data === "buy_10") amount = 10;
    if (data === "buy_20") amount = 20;
    if (data === "buy_50") amount = 50;

    // تسجيل الطلب
    orders.push({
        user: chatId,
        amount: amount,
        time: new Date()
    });

    bot.sendMessage(chatId, `📦 تم تسجيل طلب $${amount} (بانتظار التنفيذ)`);
});

// 👑 ADMIN ID (غيره لايدك)
const ADMIN_ID = 123456789;

// لوحة التحكم
bot.onText(/\/admin/, (msg) => {
    if (msg.chat.id !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "❌ غير مصرح");
    }

    bot.sendMessage(msg.chat.id, `
👑 لوحة التحكم

/orders
/balance
    `);
});

// عرض الطلبات
bot.onText(/\/orders/, (msg) => {
    if (msg.chat.id !== ADMIN_ID) return;

    if (orders.length === 0) {
        return bot.sendMessage(msg.chat.id, "❌ لا يوجد طلبات");
    }

    let text = "📦 الطلبات:\n\n";

    orders.forEach((o, i) => {
        text += `${i + 1}- ID: ${o.user} | $${o.amount}\n`;
    });

    bot.sendMessage(msg.chat.id, text);
});

console.log("VIP BOT WITH RELOADLY RUNNING...");
