const { cmd } = require('../command');

cmd({
    pattern: "qr",
    alias: ["qrcode"],
    desc: "Generate QR code for text or link",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර QR කෝඩ් එකක් සෑදීමට අවශ්‍ය ටෙක්ස්ට් එකක් හෝ ලින්ක් එකක් ලබා දෙන්න!\nඋදා: `.qr https://github.com`");

        let qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(q)}`;

        await conn.sendMessage(from, {
            image: { url: qrUrl },
            caption: `╭━━━〔 *SACHIYA-MD QR CODE* 〕━━━\n┃\n┃ 📌 *Data:* ${q}\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n> *⚡ Powered by SACHIYA-MD 💫*`
        }, { quoted: mek });

    } catch (e) {
        reply("❌ QR කෝඩ් එක සෑදීමේදී දෝෂයක් ඇති විය!");
    }
});
