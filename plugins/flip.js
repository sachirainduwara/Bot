const { cmd } = require('../command');

cmd({
    pattern: "flip",
    alias: ["coin", "cointoss"],
    desc: "Flip a coin (Heads or Tails)",
    category: "fun",
    filename: __filename
},
async (conn, mek, m, { from, reply }) => {
    try {
        let results = ["Heads (හිස)", "Tails (පස්ස)"];
        let toss = results[Math.floor(Math.random() * results.length)];

        const msg = `╭━━━〔 *COIN FLIP* 〕━━━\n` +
                    `┃\n` +
                    `┃ 🪙 *Result:* ${toss}\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(msg);
    } catch (e) {
        reply("❌ කාසි පිම්බීමේදී දෝෂයක් ඇති විය!");
    }
});
