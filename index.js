const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const ADMIN_ID = 1281070961; //  حط ID حقك هنا

let pending = {};
let orders = [];

// ===== توكن Reloadly =====
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
        console.log(err.response?.data || err.message);
        return null;
    }
}

// ===== start =====
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
        "متجر VIP\n\n" +
        "/binance\n" +
        "/balance\n" +
        "/admin"
    );
});

// ===== الرصيد =====
bot.onText(/\/balance/, async (msg) => {
    const chatId = msg.chat.id;

    const token = await getToken();
    if (!token) return bot.sendMessage(chatId, "فشل الاتصال");

    try {
        const res = await axios.get(
            "https://giftcards.reloadly.com/accounts/balance",
            {
                headers: { Authorization: `Bearer ${token}` }
            }
        );

        bot.sendMessage(chatId, "رصيدك: $" + res.data.balance);
    } catch (err) {
        bot.sendMessage(chatId, "خطأ في جلب الرصيد");
    }
});

// ===== اختيار السعر =====
bot.onText(/\/binance/, (msg) => {
    const chatId = msg.chat.id;

    bot.sendMessage(chatId, "اختر السعر:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "$10", callback_data: "buy_10" }],
                [{ text: "$20", callback_data: "buy_20" }],
                [{ text: "$50", callback_data: "buy_50" }],
                [{ text: "$100", callback_data: "buy_100" }],
                [{ text: "$200", callback_data: "buy_200" }],
                [{ text: "$500", callback_data: "buy_500" }]
            ]
        }
    });
});

// ===== عند الضغط =====
bot.on("callback_query", (query) => {
    const chatId = query.message.chat.id;
    const amount = query.data.split("_")[1];

    pending[chatId] = { amount };

    bot.sendMessage(chatId, "ادخل بريد المستلم:");
});

// ===== استقبال البيانات =====
bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    if (!pending[chatId]) return;

    if (!pending[chatId].email) {
        pending[chatId].email = msg.text;
        return bot.sendMessage(chatId, "ادخل اسم المرسل:");
    }

    if (!pending[chatId].sender) {
        pending[chatId].sender = msg.text;

        const { amount, email, sender } = pending[chatId];
        delete pending[chatId];

        await buyBinance(chatId, amount, email, sender);
    }
});

// ===== تنفيذ الشراء =====
async function buyBinance(chatId, amount, email, sender) {
    const token = await getToken();
    if (!token) return bot.sendMessage(chatId, "فشل الاتصال");

    try {
        const res = await axios.post(
            "https://giftcards.reloadly.com/orders",
            {
                productId: 12, // 🔥 عدله بعد معرفة ID الصحيح
                countryCode: "US",
                quantity: 1,
                unitPrice: amount,
                recipientEmail: email,
                senderName: sender
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        orders.push({ chatId, amount, email });

        bot.sendMessage(chatId,
            "تم الشراء\n" +
            "المبلغ: $" + amount + "\n" +
            "الايميل: " + email
        );

    } catch (err) {
        console.log(err.response?.data || err.message);
        bot.sendMessage(chatId, "فشل الشراء");
    }
}

// ===== admin =====
bot.onText(/\/admin/, (msg) => {
    if (msg.chat.id !== ADMIN_ID) {
        return bot.sendMessage(msg.chat.id, "غير مصرح");
    }

    bot.sendMessage(msg.chat.id,
        "لوحة التحكم\n\n" +
        "/orders"
    );
});

// ===== الطلبات =====
bot.onText(/\/orders/, (msg) => {
    if (msg.chat.id !== ADMIN_ID) return;

    if (orders.length === 0) {
        return bot.sendMessage(msg.chat.id, "لا يوجد طلبات");
    }

    let text = "الطلبات:\n\n";

    orders.forEach((o, i) => {
        text += `${i + 1}- $${o.amount} -> ${o.email}\n`;
    });

    bot.sendMessage(msg.chat.id, text);
});

console.log("Bot is running...");
