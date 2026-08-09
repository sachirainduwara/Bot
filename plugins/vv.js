const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../command');

cmd({
    pattern: "vv",
    alias: ["viewonce", "retrieve"],
    desc: "Get View Once media",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, quoted, reply }) => {
    try {
        // Safe check for quoted message structure
        const quot = mek.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        
        if (!quoted && !quot) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
            return reply("❌ කරුණාකර View Once මැසේජ් එකකට `.vv` කියලා Reply කරන්න!");
        }

        let targetMsg = quot || quoted.message;
        if (!targetMsg) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
            return reply("❌ රිප්ලය් කළ මැසේජ් එක කියවා ගැනීමට නොහැක!");
        }

        // Unwrapping ephemeral & view once wrappers safely
        if (targetMsg.ephemeralMessage) targetMsg = targetMsg.ephemeralMessage.message;
        if (targetMsg.viewOnceMessage) targetMsg = targetMsg.viewOnceMessage.message;
        if (targetMsg.viewOnceMessageV2) targetMsg = targetMsg.viewOnceMessageV2.message;
        if (targetMsg.viewOnceMessageV2Extension) targetMsg = targetMsg.viewOnceMessageV2Extension.message;

        let mediaType = Object.keys(targetMsg)[0];

        if (!mediaType || (!mediaType.includes('imageMessage') && !mediaType.includes('videoMessage') && !mediaType.includes('audioMessage'))) {
            await conn.sendMessage(from, { react: { text: "⚠️", key: mek.key } }).catch(() => {});
            return reply("⚠️ මෙය View Once හෝ නිවැරදි මීඩියා මැසේජ් එකක් නොවේ!");
        }

        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } }).catch(() => {});

        // Safe Media Downloading using Baileys stream
        const stream = await downloadMediaMessage({ message: targetMsg }, 'stream').catch(() => null);
        
        if (!stream) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
            return reply("❌ *Failed to download media stream!*");
        }

        const bufferArray = [];
        for await (const chunk of stream) {
            bufferArray.push(chunk);
        }
        const mediaBuffer = Buffer.concat(bufferArray);

        let caption = targetMsg[mediaType].caption || '';
        let originalSender = mek.message?.extendedTextMessage?.contextInfo?.participant || quoted?.sender || from;

        // Sri Lanka Timezone Date & Time
        const currentDate = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo' });
        const currentTime = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const newCaption = `╭━━━〔 *SACHIYA MD ✨ ViewOnce* 〕━━━╮\n` +
                           `┃\n` +
                           `┃ 👤 *Sender:* @${originalSender.split('@')[0]}\n` +
                           `┃ 📅 *Date:* ${currentDate}\n` +
                           `┃ ⏰ *Time:* ${currentTime}\n` +
                           `┃ 🏷️ *Type:* ${mediaType === 'imageMessage' ? '📷 Image' : mediaType === 'videoMessage' ? '🎥 Video' : '🎵 Audio'}\n` +
                           `┃\n` +
                           `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n` +
                           (caption ? `\n📄 *Original Caption:* ${caption}\n\n` : '') +
                           `> *⚡ Powered by SACHIYA-MD 💫*`;

        if (mediaType === 'imageMessage') {
            await conn.sendMessage(from, { image: mediaBuffer, caption: newCaption, mentions: [originalSender] }, { quoted: mek });
        } else if (mediaType === 'videoMessage') {
            await conn.sendMessage(from, { video: mediaBuffer, caption: newCaption, mentions: [originalSender] }, { quoted: mek });
        } else if (mediaType === 'audioMessage') {
            await conn.sendMessage(from, { audio: mediaBuffer, mimetype: 'audio/mp4', ptt: targetMsg[mediaType].ptt, mentions: [originalSender] }, { quoted: mek });
        }

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    } catch (e) {
        console.error("[SACHIYA MD VV ERROR]:", e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        reply("❌ *අසාර්ථකයි!* \n\nසමාවන්න, View Once මාධ්‍යය ලබා ගැනීමේදී දෝෂයක් සිදු විය.");
    }
});
