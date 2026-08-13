const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "fact",
    alias: ["randomfact"],
    desc: "Get an interesting random fact",
    category: "fun",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const res = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
        
        const msg = `╭━━━〔 *SACHIYA-MD RANDOM FACT* 〕━━━\n` +
                    `┃\n` +
                    `┃ 🧠 *Fact:* ${res.data.text}\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(msg);
    } catch (e) {
        reply("❌ තොරතුරු ලබාගැනීමේදී දෝෂයක් ඇති විය!");
    }
});
