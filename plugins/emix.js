const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "emix",
    alias: ["emojimix"],
    desc: "Mix two emojis together",
    category: "fun",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q || !q.includes('+')) {
            return reply("⚠️ භාවිත කරන ආකාරය:\nඋදා: `.emix 😂+❤️`");
        }

        let emojis = q.split('+');
        let e1 = emojis[0].trim();
        let e2 = emojis[1].trim();

        let url = `https://itzpire.com/maker/emojimix?emoji1=${encodeURIComponent(e1)}&emoji2=${encodeURIComponent(e2)}`;
        // Fallback or direct image response handling
        await conn.sendMessage(from, {
            image: { url: `https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u${e1.codePointAt(0).toString(16)}/u${e1.codePointAt(0).toString(16)}_u${e2.codePointAt(0).toString(16)}.png` },
            caption: `> *⚡ Powered by SACHIYA-MD 💫*`
        }, { quoted: mek });

    } catch (e) {
        reply("❌ මෙම ඉමොජි දෙක මිශ්‍ර කළ නොහැක!");
    }
});
