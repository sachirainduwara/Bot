const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "define",
    alias: ["meaning", "dictionary"],
    desc: "Get definition of an English word",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර සෙවිය යුතු වචනයක් ලබා දෙන්න!\nඋදා: `.define programming`");

        const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(q)}`);
        const data = res.data[0];
        const meaning = data.meanings[0].definitions[0].definition;
        const example = data.meanings[0].definitions[0].example || "උදාහරණයක් නොමැත";

        const msg = `╭━━━〔 *DICTIONARY SEARCH* 〕━━━\n` +
                    `┃\n` +
                    `┃ 📖 *Word:* ${data.word}\n` +
                    `┃ 🔍 *Meaning:* ${meaning}\n` +
                    `┃ 💡 *Example:* ${example}\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(msg);
    } catch (e) {
        reply("❌ අදාළ වචනයේ තේරුම සොයාගත නොහැකි විය!");
    }
});
