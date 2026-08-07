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
        if (!quoted) {
            return reply("❌ කරුණාකර View Once මැසේජ් එකකට `.vv` කියලා Reply කරන්න!");
        }

        let msg = quoted.message;
        if (!msg) {
            return reply("❌ රිප්ලය් කළ මැසේජ් එක කියවා ගැනීමට නොහැක!");
        }

        // Handle wrapped messages (Ephemerals, ViewOnce v1/v2)
        if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message;
        if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message;
        if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message;
        if (msg.viewOnceMessageV2Extension) msg = msg.viewOnceMessageV2Extension.message;

        let mediaType = Object.keys(msg)[0];
        
        // Check if media itself has viewOnce flag set to true or is a viewOnce type
        let isViewOnce = msg[mediaType]?.viewOnce || 
                         mediaType.includes('viewOnce') || 
                         quoted.mtype?.includes('viewOnce');

        // Fallback: If it's an image/video/audio message inside quoted, let's check deeper
        if (!mediaType || (!['imageMessage', 'videoMessage', 'audioMessage'].includes(mediaType))) {
            // Try extracting from quoted directly if mtype is standard
            if (quoted.mtype === 'imageMessage' || quoted.mtype === 'videoMessage' || quoted.mtype === 'audioMessage') {
                mediaType = quoted.mtype;
                msg = { [mediaType]: quoted.message[mediaType] };
            } else {
                return reply("⚠️ මෙය View Once මැසේජ් එකක් හෝ නිවැරදි මීඩියා මැසේජ් එකක් නොවේ!");
            }
        }

        reply("⏳ *SACHIYA MD ✨ ViewOnce Retrieving...* කරුණාකර මොහොතක් රැඳී සිටින්න...");

        const stream = await downloadMediaMessage(msg[mediaType], 'stream');
        const buffer = [];
        for await (const chunk of stream) {
            buffer.push(chunk);
        }
        const mediaBuffer = Buffer.concat(buffer);

        let caption = msg[mediaType].caption || '';
        const originalSender = quoted.key.participant || quoted.key.remoteJid;

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
        reply("*අසාර්ථකයි!* \n\nසමාවන්න, View Once මාධ්‍යය ලබා ගැනීමේදී දෝෂයක් සිදු විය.");
    }
});
