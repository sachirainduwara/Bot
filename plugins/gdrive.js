const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "gdrive",
    alias: ["googledrive", "gddl"],
    desc: "Download any file from Google Drive securely and perfectly",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply(
                `╭━━━〔 *GOOGLE DRIVE DOWNLOADER* 〕━━━\n` +
                `┃\n` +
                `┃ ⚠️ *කරුණාකර Google Drive ලින්ක් එකක් ලබා දෙන්න!*\n` +
                `┃ *උදාහරණය:* \`.gdrive https://drive.google.com/file/d/.../\`\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `> * Powered by SACHIYA-MD 💫*`
            );
        }

        // 1. Extract File ID safely using Regex
        const match = q.match(/\/d\/([a-zA-Z0-9_-]+)/) || q.match(/id=([a-zA-Z0-9_-]+)/);
        if (!match) {
            return reply("❌ *වැරදි Google Drive ලින්ක් එකකි! කරුණාකර නිවැරදි ලින්ක් එකක් ලබා දෙන්න.*");
        }

        const fileId = match[1];

        // ⏳ Loading Reaction දීම
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } }).catch(() => {});
        await reply("⏳ *ෆයිල් එක Check කරමින් සහ Download කරමින් පවතී, කරුණාකර රැඳී සිටින්න...*");

        // 2. Initial Request to Google Drive
        let downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        let response;

        try {
            response = await axios.get(downloadUrl, {
                maxRedirects: 10,
                responseType: 'arraybuffer',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
        } catch (err) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
            return reply("❌ *ඩවුන්ලෝඩ් කිරීමට නොහැකි විය. මෙම ෆයිල් එක Public (Anyone with the link) කර ඇත්දැයි පරීක්ෂා කරන්න.*");
        }

        let buffer = Buffer.from(response.data);
        let cookies = response.headers['set-cookie'];
        let cookieHeader = cookies ? cookies.join(';') : '';
        let responseStr = buffer.toString('utf8');

        // 3. Handle Google Drive Virus Warning / Confirmation Page for large/restricted files
        if (buffer.length < 100000 && (responseStr.includes('uc-download-link') || responseStr.includes('confirm=') || responseStr.includes('download_warning'))) {
            const confirmMatch = responseStr.match(/confirm=([0-9A-Za-z_]+)/) || responseStr.match(/name="confirm"\s+value="([0-9A-Za-z_]+)"/);
            const confirmToken = confirmMatch ? confirmMatch[1] : null;

            if (confirmToken) {
                const forcedUrl = `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`;
                try {
                    const secondRes = await axios.get(forcedUrl, {
                        headers: {
                            Cookie: cookieHeader,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        responseType: 'arraybuffer',
                        maxRedirects: 10
                    });
                    buffer = Buffer.from(secondRes.data);
                } catch (err) {
                    console.error('Force Download Error:', err.message);
                }
            }
        }

        // 4. Extract Real File Name from Content-Disposition headers
        let fileName = `GoogleDrive_File_${fileId}.xml`; // Default as xml if it's config/xml
        const contentDisposition = response.headers['content-disposition'];
        if (contentDisposition) {
            const fileNameMatch = contentDisposition.match(/filename="(.+?)"/) || contentDisposition.match(/filename=([^;]+)/);
            if (fileNameMatch && fileNameMatch[1]) {
                fileName = fileNameMatch[1].replace(/["']/g, '');
            }
        }

        // 5. Check if it's an HTML error page instead of real file
        let finalStrCheck = buffer.toString('utf8');
        if (buffer.length < 2000 && finalStrCheck.includes('<!DOCTYPE html>')) {
            await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
            return reply("❌ *මෙම ෆයිල් එක බාගත කළ නොහැක. ෆයිල් එක Private වැඩි වීමක් හෝ Google ප්‍රවේශ සීමා කිරීමක් නිසා මෙය සිදුවිය හැක.*");
        }

        const fileSizeMB = (buffer.length / (1024 * 1024)).toFixed(2);

        const caption = `╭━━━〔 *GOOGLE DRIVE DOWNLOADER* 〕━━━\n` +
                        `┃\n` +
                        `┃ 📂 *File Name:* ${fileName}\n` +
                        `┃ 📦 *File Size:* ${fileSizeMB} MB\n` +
                        `┃ 🟢 *Status:* Downloaded Successfully ✅\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `> * Powered by SACHIYA-MD 💫*`;

        // Determine correct Mimetype to prevent .bin issue
        let mimetype = 'application/octet-stream';
        if (fileName.endsWith('.zip')) mimetype = 'application/zip';
        else if (fileName.endsWith('.apk')) mimetype = 'application/vnd.android.package-archive';
        else if (fileName.endsWith('.mp4')) mimetype = 'video/mp4';
        else if (fileName.endsWith('.pdf')) mimetype = 'application/pdf';
        else if (fileName.endsWith('.xml')) mimetype = 'text/xml';
        else if (fileName.endsWith('.json')) mimetype = 'application/json';

        // 6. Send the actual file as document
        await conn.sendMessage(from, {
            document: buffer,
            mimetype: mimetype,
            fileName: fileName,
            caption: caption
        }, { quoted: mek });

        // ✅ Success Reaction
        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});

    } catch (e) {
        console.error('Gdrive Execution Error:', e);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
        return reply(`❌ *දෝෂයක් මතු විය: ${e.message || 'Unknown error'}*`);
    }
});
