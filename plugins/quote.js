const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "quote",
    alias: ["qts", "motivation"],
    desc: "Get an inspirational quote",
    category: "fun",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const res = await axios.get('https://api.quotable.io/random');
        const data = res.data;

        const quoteMsg = `╭━━━〔 *SACHIYA-MD QUOTE* 〕━━━\n` +
                         `┃\n` +
                         `┃ 💬 *"${data.content}"*\n` +
                         `┃ ✍️ *Author:* ${data.author}\n` +
                         `┃\n` +
                         `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                         `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(quoteMsg);
    } catch (e) {
        reply("❌ උපුටා දැක්වීම ලබාගැනීමේදී දෝෂයක් ඇති විය!");
    }
});
