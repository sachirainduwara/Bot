const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "gdrive",
    alias: ["googledrive"],
    desc: "Download files from Google Drive",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර Google Drive ලින්ක් එක ලබා දෙන්න!\nඋදා: `.gdrive https://drive.google.com/file/...`");

        reply("⏳ ෆයිල් තොරතුරු ලබාගනිමින් පවතී...");

        const res = await axios.get(`https://api.siputzx.my.id/api/d/gdrive?url=${encodeURIComponent(q)}`);
        const data = res.data;

        if (!data.status || !data.data) {
            return reply("❌ අදාළ ගූගල් ඩ්‍රයිව් ලින්ක් එකෙන් ෆයිල් එක ලබා ගැනීමට නොහැකි විය!");
        }

        let file = data.data;
        let caption = `╭━━━〔 *GOOGLE DRIVE DOWNLOADER* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📂 *File Name:* ${file.fileName}\n` +
                      `┃ 📦 *Size:* ${file.fileSize}\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                      `> *⚡ Powered by SACHIYA-MD 💫*`;

        await conn.sendMessage(from, { document: { url: file.downloadUrl }, mimetype: file.mimetype || 'application/octet-stream', fileName: file.fileName, caption: caption }, { quoted: mek });

    } catch (e) {
        reply("❌ ඩවුන්ලෝඩ් කිරීමේදී දෝෂයක් ඇති විය!");
    }
});
