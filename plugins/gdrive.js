const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "gdrive",
    alias: ["googledrive"],
    desc: "Download any file from Google Drive securely",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර Google Drive ලින්ක් එක ලබා දෙන්න!\nඋදා: `.gdrive https://drive.google.com/file/d/...`");

        // Extract File ID safely using regex
        let match = q.match(/\/d\/([a-zA-Z0-9_-]+)/) || q.match(/id=([a-zA-Z0-9_-]+)/);
        if (!match) return reply("❌ වැරදි Google Drive ලින්ක් එකකි! නිවැරදි ලින්ක් එකක් ලබා දෙන්න.");

        let fileId = match[1];
        await reply("⏳ ෆයිල් එක බාගත කරමින් පවතී, කරුණාකර රැඳී සිටින්න...");

        // Direct Download URL for Google Drive
        let downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

        let response;
        try {
            response = await axios.get(downloadUrl, { 
                maxRedirects: 10, 
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
        } catch (err) {
            return reply("❌ ඩවුන්ලෝඩ් කිරීමට නොහැකි විය. මෙම ෆයිල් එක Public කර ඇත්දැයි පරීක්ෂා කරන්න.");
        }

        let buffer = Buffer.from(response.data);
        
        // Check if file is too small (meaning an error page text)
        let textCheck = buffer.toString('utf8');
        if (buffer.length < 5000 && (textCheck.includes('Access Denied') || textCheck.includes('File is private'))) {
            return reply("❌ මෙම ෆයිල් එක Private වැඩි වීම නිසා බාගත නොහැක. කරුණාකර පබ්ලික් ලින්ක් එකක් ලබා දෙන්න.");
        }

        let fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

        let caption = `╭━━━〔 *GOOGLE DRIVE DOWNLOADER* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📂 *Status:* Downloaded Successfully ✅\n` +
                      `┃ 📦 *File Size:* ${fileSizeMB} MB\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                      `> *⚡ Powered by SACHIYA-MD 💫*`;

        // Send the file directly as document (Supports XML, ZIP, APK, MP4, etc.)
        await conn.sendMessage(from, { 
            document: buffer, 
            mimetype: 'application/octet-stream', 
            fileName: `GoogleDrive_File_${fileId}.bin`, 
            caption: caption 
        }, { quoted: mek });

    } catch (e) {
        console.error('Gdrive Error:', e);
        reply("❌ ඩවුන්ලෝඩ් කිරීමේදී දෝෂයක් ඇති විය! කරුණාකර නැවත උත්සාහ කරන්න.");
    }
});
