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
        // Check if an image is sent directly or quoted properly
        const isQuotedImage = quoted && (quoted.mtype === 'imageMessage' || quoted.msg?.mtype === 'imageMessage' || (quoted.message && quoted.message.imageMessage));
        const isDirectImage = m.mtype === 'imageMessage';

        if (!isQuotedImage && !isDirectImage) {
            const usedPrefix = prefix || "."; // Fallback if prefix is undefined
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

        // Download the image media safely using bot's built-in download function
        const mediaMsg = isQuotedImage ? quoted : mek;
        const buffer = typeof mediaMsg.download === 'function' ? await mediaMsg.download() : await conn.downloadMediaMessage(mediaMsg);
        
        if (!buffer) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ *Failed to download the image. Please try again!* ⚠️");
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
            return reply("❌ *Failed to remove background. The image might be too complex or API limit reached!* ⚠️");
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
