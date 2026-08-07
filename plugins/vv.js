const { sms, downloadMediaMessage } = require('../lib/msg');
const { cmd } = require('../command');

cmd({
    pattern: "vv",
    alias: ["viewonce", "retrieve"],
    desc: "Fetch View Once media",
    category: "download",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!quoted) {
            return reply("කරුණාකර View Once මැසේජ් එකකට `.vv` කියලා Reply කරන්න!");
        }

        let msg = quoted.message;
        
        // Handle different types of View Once wrappers
        if (msg.ephemeralMessage) {
            msg = msg.ephemeralMessage.message;
        }
        if (msg.viewOnceMessage) {
            msg = msg.viewOnceMessage.message;
        } else if (msg.viewOnceMessageV2) {
            msg = msg.viewOnceMessageV2.message;
        } else if (msg.viewOnceMessageV2Extension) {
            msg = msg.viewOnceMessageV2Extension.message;
        }

        let mediaType = Object.keys(msg)[0];
        
        if (!mediaType || (!mediaType.includes('imageMessage') && !mediaType.includes('videoMessage') && !mediaType.includes('audioMessage'))) {
            return reply("View Once මැසේජ් එකක් නොවේ! කරුණාකර View Once (1-time) මැසේජ් එකකට Reply කරන්න.");
        }

        let stream = await downloadMediaMessage(msg[mediaType]);
        let caption = msg[mediaType].caption || '';

        if (mediaType === 'imageMessage') {
            await conn.sendMessage(from, { image: stream, caption: caption }, { quoted: mek });
        } else if (mediaType === 'videoMessage') {
            await conn.sendMessage(from, { video: stream, caption: caption }, { quoted: mek });
        } else if (mediaType === 'audioMessage') {
            await conn.sendMessage(from, { audio: stream, mimetype: 'audio/mp4', ptt: msg[mediaType].ptt }, { quoted: mek });
        } else {
            return reply("මෙම වර්ගයේ View Once මාධ්‍යය බාගත කළ නොහැක.");
        }

    } catch (e) {
        console.error("[VV PLUGIN ERROR]:", e);
        reply("සමාවන්න, View Once මැසේජ් එක ලබා ගැනීමේදී දෝෂයක් සිදු විය!");
    }
});
