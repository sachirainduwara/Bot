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

        // Extract File ID from Google Drive URL
        let match = q.match(/\/d\/([a-zA-Z0-9_-]+)/) || q.match(/id=([a-zA-Z0-9_-]+)/);
        if (!match) return reply("❌ වැරදි Google Drive ලින්ක් එකකි! නිවැරදි ලින්ක් එකක් ලබා දෙන්න.");

        let fileId = match[1];
        await reply("⏳ File එක Check කරමින් සහ Download කරමින් පවතී, කරුණාකර රැඳී සිටින්න...");

        // Google Drive direct download URL with confirmation bypass
        let initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

        let response;
        try {
            response = await axios.get(initialUrl, { maxRedirects: 5, responseType: 'arraybuffer' });
        } catch (err) {
            return reply("❌ ඩවුන්ලෝඩ් කිරීමට නොහැකි විය. මෙම ෆයිල් එක Public කර ඇත්දැයි සහ View Access ඇති බව තහවුරු කරගන්න.");
        }

        let buffer = Buffer.from(response.data);

        // Check if Google returned a virus warning html page instead of the actual file
        if (buffer.length < 50000 && (buffer.toString('utf8').includes('<html>') || buffer.toString('utf8').includes('download_warning'))) {
            // Extract confirm token for large files
            let cookies = response.headers['set-cookie'];
            let cookieHeader = cookies ? cookies.join(';') : '';
            
            let confirmMatch = response.data.toString('utf8').match(/confirm=([0-9A-Za-z_]+)/);
            let confirmToken = confirmMatch ? confirmMatch[1] : 't';

            let forcedUrl = `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`;
            
            let secondRes = await axios.get(forcedUrl, {
                headers: { Cookie: cookieHeader },
                responseType: 'arraybuffer'
            });
            buffer = Buffer.from(secondRes.data);
        }

        let caption = `╭━━━〔 *GOOGLE DRIVE DOWNLOADER* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📂 *Status:* Downloaded Successfully ✅\n` +
                      `┃ 📦 *Size:* ${(buffer.length / (1024 * 1024)).toFixed(2)} MB\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                      `> *⚡ Powered by SACHIYA-MD 💫*`;

        await conn.sendMessage(from, { 
            document: buffer, 
            mimetype: 'application/octet-stream', 
            fileName: `GoogleDrive_File_${fileId}.zip`, 
            caption: caption 
        }, { quoted: mek });

    } catch (e) {
        console.error('Gdrive Error:', e);
        reply("❌ ඩවුන්ලෝඩ් කිරීමේදී දෝෂයක් ඇති විය! ෆයිල් එක ඉතා විශාල වැඩි වීමක් හෝ පබ්ලික් නොවීම නිසා මෙය සිදුවිය හැක.");
    }
});
