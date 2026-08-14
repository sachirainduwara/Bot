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

        // Google Drive share link එක direct download link එකක් බවට හැරවීම
        let match = q.match(\/d\/([a-zA-Z0-9_-]+)/);
        if (!match) return reply("❌ වැරදි Google Drive ලින්ක් එකකි!");

        let fileId = match[1];
        let directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

        reply("⏳ ෆයිල් එක බාගත කරමින් පවතී, කරුණාකර රැඳී සිටින්න...");

        let caption = `╭━━━〔 *GOOGLE DRIVE DOWNLOADER* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📂 *Status:* Downloaded Successfully ✅\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                      `> *⚡ Powered by SACHIYA-MD 💫*`;

        await conn.sendMessage(from, { 
            document: { url: directUrl }, 
            fileName: `GoogleDrive_File_${fileId}.bin`, 
            caption: caption 
        }, { quoted: mek });

    } catch (e) {
        reply("❌ ඩවුන්ලෝඩ් කිරීමේදී දෝෂයක් ඇති විය! (මෙම ෆයිල් එක Private හෝ View Access නැති එකක් විය හැක)");
    }
});
