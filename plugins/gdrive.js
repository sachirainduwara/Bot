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
        await reply("⏳ ෆයිල් එක පරීක්ෂා කරමින් සහ බාගත කරමින් පවතී, කරුණාකර රැඳී සිටින්න...");

        // Initial request to get file info and cookies/tokens
        let initialUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        let response;
        
        try {
            response = await axios.get(initialUrl, { 
                maxRedirects: 5, 
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                }
            });
        } catch (err) {
            return reply("❌ ඩවුන්ලෝඩ් කිරීමට නොහැකි විය. මෙම ෆයිල් එක Public කර ඇත්දැයි සහ Anyone with the link ලබා දී ඇත්දැයි පරීක්ෂා කරන්න.");
        }

        let buffer = Buffer.from(response.data);
        let cookies = response.headers['set-cookie'];
        let cookieHeader = cookies ? cookies.join(';') : '';

        // Check if Google returned a confirmation page (Virus Warning for large files)
        let responseText = buffer.toString('utf8');
        if (buffer.length < 100000 && (responseText.includes('uc-download-link') || responseText.includes('confirm=') || responseText.includes('download_warning'))) {
            
            let confirmMatch = responseText.match(/confirm=([0-9A-Za-z_]+)/) || responseText.match(/name="confirm"\s+value="([0-9A-Za-z_]+)"/);
            let confirmToken = confirmMatch ? confirmMatch[1] : null;

            if (confirmToken) {
                let forcedUrl = `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`;
                let secondRes = await axios.get(forcedUrl, {
                    headers: { 
                        Cookie: cookieHeader,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    },
                    responseType: 'arraybuffer'
                });
                buffer = Buffer.from(secondRes.data);
            }
        }

        // Final check to see if it's still an HTML error page
        if (buffer.length < 50000 && buffer.toString('utf8').includes('<!DOCTYPE html>')) {
            return reply("❌ මෙම ෆයිල් එක ඩවුන්ලෝඩ් කළ නොහැක. ෆයිල් එක Private වැඩි වීමක් නිසා හෝ Google සීමා කිරීමක් නිසා මෙය සිදුවිය හැක.");
        }

        let fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

        let caption = `╭━━━〔 *GOOGLE DRIVE DOWNLOADER* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📂 *Status:* Downloaded Successfully ✅\n` +
                      `┃ 📦 *File Size:* ${fileSizeMB} MB\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                      `> *⚡ Powered by SACHIYA-MD 💫*`;

        await conn.sendMessage(from, { 
            document: buffer, 
            mimetype: 'application/octet-stream', 
            fileName: `SACHIYA-MD_File_${fileId}.zip`, 
            caption: caption 
        }, { quoted: mek });

    } catch (e) {
        console.error('Gdrive Error:', e);
        reply("❌ ඩවුන්ලෝඩ් කිරීමේදී දෝෂයක් ඇති විය! ලින්ක් එක නිවැරදි බව සහ ෆයිල් එක පබ්ලික් කර ඇති බව තහවුරු කරගන්න.");
    }
});
