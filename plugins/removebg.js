const { cmd } = require('../command');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "removebg",
    alias: ["rmbg", "bgremove"],
    desc: "Remove background from images",
    category: "tools",
    react: "✂️",
    filename: __filename
}, async (conn, mek, m, { from, quoted, reply, prefix, command }) => {
    try {
        // Find if an image is sent directly or via quote
        const quot = m.quoted ? m.quoted : quoted;
        
        const isImage = m.mtype === 'imageMessage';
        const isQuotedImage = quot && (quot.mtype === 'imageMessage' || (quot.message && quot.message.imageMessage));

        if (!isImage && !isQuotedImage) {
            const usedPrefix = prefix || ".";
            return reply(
                `╭━━━〔 *✂️ BACKGROUND REMOVER* 〕━━━\n` +
                `┃\n` +
                `┃ ⚠️ *Please reply to an image with the command!* \n` +
                `┃ 📌 *Example:* \`${usedPrefix + command}\` (replying to an image)\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`
            );
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // Download media based on message type
        let mediaMsg = isImage ? mek : (quot.download ? quot : m.quoted);
        let buffer;
        
        try {
            if (typeof mediaMsg.download === 'function') {
                buffer = await mediaMsg.download();
            } else if (conn.downloadAndSaveMediaMessage) {
                // Fallback for some specific bot frameworks
                buffer = await conn.downloadMediaMessage(isImage ? mek : quot);
            } else {
                // Direct download fallback using message object
                buffer = await m.quoted.download();
            }
        } catch (downloadErr) {
            console.error("Download error details:", downloadErr);
        }

        if (!buffer) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ *Failed to download the image. Make sure to reply directly to the image!* ⚠️");
        }

        // Save buffer temporarily to send via FormData
        const tempFilePath = path.join(__dirname, `../temp_${Date.now()}.png`);
        fs.writeFileSync(tempFilePath, buffer);

        let removeBgSuccess = false;
        let resultBuffer = null;

        try {
            const form = new FormData();
            form.append('image_file', fs.createReadStream(tempFilePath));
            
            const altRes = await axios.post('https://bgremover.cyou/api/remove', form, {
                headers: { ...form.getHeaders() },
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            if (altRes.status === 200) {
                resultBuffer = Buffer.from(altRes.data);
                removeBgSuccess = true;
            }
        } catch (fallbackErr) {
            console.error("BG Remove API Error:", fallbackErr.message);
        }

        // Clean up local temp file safely
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        if (!removeBgSuccess || !resultBuffer) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ *Failed to remove background. The API might be temporarily down!* ⚠️");
        }

        // Send the result image as a clean PNG image
        const captionText = `╭━━━〔 *✂️ BACKGROUND REMOVED* 〕━━━\n` +
                            `┃\n` +
                            `┃ 📥 *Status:* Successfully Removed! ✅\n` +
                            `┃ 🎨 *Format:* PNG (Transparent)\n` +
                            `┃\n` +
                            `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                            `> *⚡ Powered by SACHIYA-MD 💫*`;

        await conn.sendMessage(from, {
            image: resultBuffer,
            caption: captionText
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error("RemoveBG Error:", e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply(`❌ *An unexpected error occurred:* ${e.message} ⚠️`);
    }
});
