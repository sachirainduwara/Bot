const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "ai",
    alias: ["gpt", "chatgpt", "openai"],
    desc: "Chat with AI",
    category: "ai",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර AI එකෙන් අසන්න අවශ්‍ය ප්‍රශ්නයක් ලියන්න!\nඋදා: `.ai Who is the president of Sri Lanka?`");

        reply("⏳ සිතමින් පවතී...");

        const res = await axios.get(`https://api.siputzx.my.id/api/ai/chatgpt?query=${encodeURIComponent(q)}`);
        const data = res.data;

        if (!data.status || !data.data) {
            return reply("❌ පිළිතුරක් ලබා ගැනීමට නොහැකි විය!");
        }

        let answer = data.data;
        await reply(`🤖 *SACHIYA-MD AI*\n\n${answer}`);

    } catch (e) {
        reply("❌ AI සමඟ සම්බන්ධ වීමේදී දෝෂයක් ඇති විය!");
    }
});
