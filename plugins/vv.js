const { sms, downloadMediaMessage } = require('../lib/msg');
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
            // Reaction for error: Cross mark
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
            return reply("❌ කරුණාකර View Once මැසේජ් එකකට `.vv` කියලා Reply කරන්න!");
        }

        let mime = quoted.mtype || '';
        let msg = quoted.message;

        if (!msg) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
            return reply("❌ රිප්ලය් කළ මැසේජ් එක කියවා ගැනීමට නොහැක!");
        }

        if (msg.ephemeralMessage) msg = msg.ephemeralMessage.message;
        if (msg.viewOnceMessage) msg = msg.viewOnceMessage.message;
        if (msg.viewOnceMessageV2) msg = msg.viewOnceMessageV2.message;
        if (msg.viewOnceMessageV2Extension) msg = msg.viewOnceMessageV2Extension.message;

        let mediaType = Object.keys(msg)[0];

        if (!mediaType || (!mediaType.includes('imageMessage') && !mediaType.includes('videoMessage') && !mediaType.includes('audioMessage'))) {
            if (quoted.message && quoted.message.imageMessage) {
                mediaType = 'imageMessage';
                msg = quoted.message;
            } else if (quoted.message && quoted.message.videoMessage) {
                mediaType = 'videoMessage';
                msg = quoted.message;
            } else {
                await conn.sendMessage(from, { react: { text: "⚠️", key: mek.key } }).catch(() => {});
                return reply("⚠️ මෙය View Once හෝ නිවැරදි මීඩියා මැසේජ් එකක් නොවේ!");
            }
        }

        // Processing Reaction (Hourglass)
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } }).catch(() => {});
        reply("⏳ *SACHIYA MD ✨ ViewOnce Retrieving...* කරුණාකර මොහොතක් රැඳී සිටින්න...");

        const mediaBuffer = await downloadMediaMessage(msg[mediaType], mediaType.replace('Message', ''));

        let caption = msg[mediaType].caption || '';
        let originalSender = quoted.sender || quoted.key?.participant || quoted.key?.remoteJid || from;

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

        // Success Reaction (Green Checkmark)
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    } catch (e) {
        console.error("[SACHIYA MD VV ERROR]:", e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        reply("❌ *SACHIYA MD ✨ අසාර්ථකයි!* \n\nසමාවන්න, View Once මාධ්‍යය ලබා ගැනීමේදී දෝෂයක් සිදු විය.");
    }
});
