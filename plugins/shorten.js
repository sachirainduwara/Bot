const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "shorten",
    alias: ["tinyurl", "short"],
    desc: "Shorten a long URL",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර කුඩා කළ යුතු ලින්ක් එක ලබා දෙන්න!\nඋදා: `.shorten https://github.com`");

        const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(q)}`);
        
        const msg = `╭━━━〔 *URL SHORTENER* 〕━━━\n` +
                    `┃\n` +
                    `┃ 📥 *Original:* ${q}\n` +
                    `┃ 📤 *Shortened:* ${res.data}\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(msg);
    } catch (e) {
        reply("❌ ලින්ක් එක කුඩා කිරීමේදී දෝෂයක් ඇති විය!");
    }
});
