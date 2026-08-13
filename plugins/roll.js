const { cmd } = require('../command');

cmd({
    pattern: "roll",
    alias: ["dice"],
    desc: "Roll a dice",
    category: "fun",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        let roll = Math.floor(Math.random() * 6) + 1;

        const msg = `╭━━━〔 *DICE ROLL* 〕━━━\n` +
                    `┃\n` +
                    `┃ 🎲 *Rolled Number:* ${roll}\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(msg);
    } catch (e) {
        reply("❌ ඩයිස් රෝල් කිරීමේදී දෝෂයක් ඇති විය!");
    }
});
