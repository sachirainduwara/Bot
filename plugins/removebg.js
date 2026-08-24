const { cmd } = require('../command');
const { fetchJson } = require('../lib/functions.js'); // ඔයාගේ බොට්ගේ api/fetch ෆන්ෂන් එක, නැත්නම් axios පාවිච්චි කරන්න පුළුවන්
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
        // 1. Check if an image is quoted or sent with the command
        const isQuotedImage = quoted && (quoted.mtype === 'imageMessage' || (quoted.message && quoted.message.imageMessage));
        const isDirectImage = m.mtype === 'imageMessage';

        if (!isQuotedImage && !isDirectImage) {
            return reply(
                `╭━━━〔 *✂️ BACKGROUND REMOVER* 〕━━━\n` +
                `┃\n` +
                `┃ ⚠️ *Please reply to an image or send an image with the command!* \n` +
                `┃ 📌 *Example:* \`${prefix + command}\` (replying to an image)\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`
            );
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // 2. Download the image media
        const mediaMsg = isQuotedImage ? quoted : mek;
        const buffer = await mediaMsg.download();
        
        if (!buffer) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ *Failed to download the image. Please try again!* ⚠️");
        }

        // Save buffer temporarily to send via FormData
        const tempFilePath = path.join(__dirname, `../temp_${Date.now()}.png`);
        fs.writeFileSync(tempFilePath, buffer);

        // 3. Using reliable remove.bg API or alternative public endpoints
        // Note: Free APIs like remove.bg have limits, so we use a stable free multi-part form upload or public endpoint
        const formData = new FormData();
        formData.append('size', 'auto');
        formData.append('image_file', fs.createReadStream(tempFilePath));

        // Let's use a stable free removal service or fallback API
        // Here we use a reliable method via axios post
        let removeBgSuccess = false;
        let resultBuffer = null;

        try {
            // Alternatively, you can use a free stable API key for remove.bg if available, 
            // but let's implement a robust free image processing fallback:
            const response = await axios.post('https://api.remove.bg/v1.0/removebg', formData, {
                headers: {
                    ...formData.getHeaders(),
                    'X-Api-Key': 'YOUR_REMOVEBG_API_KEY_HERE' // ඔයාට remove.bg එකෙන් free api key එකක් දාන්න පුළුවන්, නැත්නම් පහත free method එක වැඩ කරයි
                },
                responseType: 'arraybuffer',
                timeout: 30000
            });

            if (response.status === 200) {
                resultBuffer = response.buffer ? response.buffer() : Buffer.from(response.data);
                removeBgSuccess = true;
            }
        } catch (apiErr) {
            // Fallback to a free public processing API if primary fails
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
                console.error("BG Remove Fallback Error:", fallbackErr.message);
            }
        }

        // Clean up local temp file safely
        if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
        }

        if (!removeBgSuccess || !resultBuffer) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ *Failed to remove background. The image might be too complex or API limit reached!* ⚠️");
        }

        // 4. Send the result image as a clean PNG document/image
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
