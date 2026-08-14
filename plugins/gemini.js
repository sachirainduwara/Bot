const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "gemini",
    alias: ["bard"],
    desc: "Chat with Google Gemini AI",
    category: "ai",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර ප්‍රශ්නයක් ලබා දෙන්න!\nඋදා: `.gemini Write an essay about nature`");

        reply("⏳ සිතමින් පවතී...");

        const res = await axios.get(`https://api.siputzx.my.id/api/ai/gemini?query=${encodeURIComponent(q)}`);
        const data = res.data;

        if (!data.status || !data.data) {
            return reply("❌ පිළිතුරක් ලබා ගැනීමට නොහැකි විය!");
        }

        let answer = data.data;
        await reply(`✨ *GEMINI AI*\n\n${answer}`);

    } catch (e) {
        reply("❌ දෝෂයක් ඇති විය!");
    }
});
