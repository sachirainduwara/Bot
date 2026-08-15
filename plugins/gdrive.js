const { cmd } = require('../command');

cmd({
    pattern: "gdrive",
    alias: ["googledrive"],
    desc: "Download files from Google Drive",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර Google Drive ලින්ක් එක ලබා දෙන්න!");

        // Regex එක නිවැරදි කර ඇත
        let match = q.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (!match) return reply("❌ වැරදි Google Drive ලින්ක් එකකි!");

        let fileId = match[1];
        let directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

        await reply("⏳ ෆයිල් එක සූදානම් කරමින් පවතී, කරුණාකර රැඳී සිටින්න...");

        let caption = `╭━━━〔 *GOOGLE DRIVE DOWNLOADER* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📂 *Status:* Downloaded Successfully ✅\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                      `> *⚡ Powered by SACHIYA-MD 💫*`;

        await conn.sendMessage(from, { 
            document: { url: directUrl }, 
            mimetype: 'application/octet-stream', 
            fileName: `SACHIYA_MD_File_${fileId}.bin`, 
            caption: caption 
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        reply("❌ ඩවුන්ලෝඩ් කිරීමේදී දෝෂයක් ඇති විය! ෆයිල් එක Public බව සහතික කරගන්න.");
    }
});
