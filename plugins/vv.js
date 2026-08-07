const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { cmd } = require('../command');
const fs = require('fs');
const path = require('path');

cmd({
    pattern: "vv",
    alias: ["viewonce", "retrive"],
    desc: "Get View Once media",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, quoted, reply, pushname }) => {
    try {
        // 1. පරීක්ෂා කිරීම: රිප්ලය් කර ඇත්ද?
        if (!quoted) {
            return reply("❌ කරුණාකර View Once මැසේජ් එකකට `.vv` කියලා Reply කරන්න!");
        }

        // 2. පරීක්ෂා කිරීම: එය View Once මැසේජ් එකක්ද?
        let mime = quoted.mtype || '';
        if (!mime.includes('viewOnce')) {
            return reply("⚠️ මෙය View Once මැසේජ් එකක් නොවේ. කරුණාකර 1-time (ඡායාරූපයක් හෝ වීඩියෝවක්) මැසේජ් එකකට Reply කරන්න!");
        }

        reply("⏳ *SACHIYA MD ✨ ViewOnce Retrieving...* කරුණාකර මොහොතක් රැඳී සිටින්න...");

        // 3. මීඩියා එක ලබා ගැනීම (Extracting Media Content)
        let msg = quoted.message;
        let mediaType = Object.keys(msg)[0];
        
        // Handle different wrappers (e.g., viewOnceMessage, viewOnceMessageV2, etc.)
        if (mediaType === 'ephemeralMessage') {
            msg = msg.ephemeralMessage.message;
            mediaType = Object.keys(msg)[0];
        }
        
        if (mediaType === 'viewOnceMessage') {
            msg = msg.viewOnceMessage.message;
            mediaType = Object.keys(msg)[0];
        } else if (mediaType === 'viewOnceMessageV2') {
            msg = msg.viewOnceMessageV2.message;
            mediaType = Object.keys(msg)[0];
        } else if (mediaType === 'viewOnceMessageV2Extension') {
            msg = msg.viewOnceMessageV2Extension.message;
            mediaType = Object.keys(msg)[0];
        }

        // අදාළ මීඩියා වර්ගය තහවුරු කර ගැනීම
        const validMediaTypes = ['imageMessage', 'videoMessage', 'audioMessage'];
        if (!validMediaTypes.includes(mediaType)) {
             return reply(`❌ සමාවන්න, මෙම වර්ගයේ View Once මාධ්‍යය බාගත කළ නොහැක. (Detected: ${mediaType})`);
        }

        // 4. මීඩියා එක ඩවුන්ලෝඩ් කිරීම (Downloading Media Stream)
        const stream = await downloadMediaMessage(msg[mediaType], 'stream');
        const buffer = [];
        for await (const chunk of stream) {
            buffer.push(chunk);
        }
        const mediaBuffer = Buffer.concat(buffer);

        let caption = msg[mediaType].caption || '';
        const originalSender = quoted.key.participant || quoted.key.remoteJid; // Original sender JID

        // 5. ලස්සන කැප්ෂන් එකක් එක්ක යැවීම (Sending with SACHIYA MD Styling)
        const newCaption = `╭━━━〔 *SACHIYA MD ✨ ViewOnce* 〕━━━╮\n` +
                           `┃\n` +
                           `┃ 👤 *Sender:* @${originalSender.split('@')[0]}\n` +
                           `┃ 📅 *Date:* ${new Date().toLocaleDateString('en-GB')}\n` +
                           `┃ ⏰ *Time:* ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}\n` +
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
             await conn.sendMessage(from, { audio: mediaBuffer, mimetype: 'audio/mp4', ptt: msg[mediaType].ptt, mentions: [originalSender] }, { quoted: mek });
        }

    } catch (e) {
        console.error("[SACHIYA MD VV ERROR]:", e);
        reply("❌ *SACHIYA MD ✨ අසාර්ථකයි!* \n\nසමාවන්න, View Once මාධ්‍යය ලබා ගැනීමේදී දෝෂයක් සිදු විය. එය කල් ඉකුත් වී (Expired) තිබෙන්නට පුළුවන.");
    }
});
