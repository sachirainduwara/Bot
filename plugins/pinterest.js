const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "pinterest",
    alias: ["pin", "pindl"],
    desc: "Download images or videos from Pinterest",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර Pinterest ලින්ක් එක ලබා දෙන්න!\nඋදා: `.pinterest https://pin.it/...`");

        reply("⏳ මාධ්‍ය බාගත කරමින් පවතී...");

        const res = await axios.get(`https://api.siputzx.my.id/api/d/pinterest?url=${encodeURIComponent(q)}`);
        const data = res.data;

        if (!data.status || !data.data) {
            return reply("❌ අදාළ ලින්ක් එකෙන් ෆොටෝ එක හෝ වීඩියෝව ලබා ගැනීමට නොහැකි විය!");
        }

        let mediaUrl = data.data.url || data.data.download;
        let isVideo = mediaUrl.includes('.mp4');

        if (isVideo) {
            await conn.sendMessage(from, { video: { url: mediaUrl }, caption: `> *⚡ Powered by SACHIYA-MD 💫*` }, { quoted: mek });
        } else {
            await conn.sendMessage(from, { image: { url: mediaUrl }, caption: `> *⚡ Powered by SACHIYA-MD 💫*` }, { quoted: mek });
        }

    } catch (e) {
        reply("❌ ඩවුන්ලෝඩ් කිරීමේදී දෝෂයක් ඇති විය!");
    }
});
