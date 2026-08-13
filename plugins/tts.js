const { cmd } = require('../command');
const googleTTS = require('google-tts-api');

cmd({
    pattern: "tts",
    alias: ["say", "speech"],
    desc: "Convert text to voice note",
    category: "convert",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර හඬ බවට හැරවිය යුතු වචන කිහිපයක් ලබා දෙන්න!\nඋදා: `.tts sinhala hello` හෝ `.tts si Ayubowan`");
        
        let lang = "si"; // Default Sinhala
        let text = q;

        if (q.length > 200) {
            return reply("❌ වචන 200 කට වඩා වැඩි ප්‍රමාණයක් එකවර ලබා දිය නොහැක!");
        }

        const url = googleTTS.getAudioUrl(text, {
            lang: lang,
            slow: false,
            host: 'https://translate.google.com',
        });

        await conn.sendMessage(from, {
            audio: { url: url },
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        reply("❌ හඬ පටය සකස් කිරීමේදී දෝෂයක් ඇති විය!");
    }
});
