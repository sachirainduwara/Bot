const { cmd } = require('../command');
const config = require('../config');

cmd({
    pattern: "repo",
    alias: ["git", "script"],
    desc: "Get GitHub repository link",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        const repoImg = config.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";

        const msg = `╭━━━〔 *SACHIYA-MD REPOSITORY* 〕━━━\n` +
                    `┃\n` +
                    `┃ 🤖 *Bot Name:* SACHIYA-MD\n` +
                    `┃ 📂 *GitHub:* https://github.com/sachirainduwara/Bot\n` +
                    `┃ ⭐ *Status:* Public & Active\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        await conn.sendMessage(from, { image: { url: repoImg }, caption: msg }, { quoted: mek });
    } catch (e) {
        reply("❌ විස්තර ලබාගැනීමේදී දෝෂයක් ඇති විය!");
    }
});
