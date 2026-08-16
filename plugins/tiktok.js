const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "tiktok",
    alias: ["tt", "tiktokdl"],
    desc: "Download TikTok videos",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!q || !q.includes('tiktok.com')) return reply("*❌ කරුණාකර సరైన TikTok ලින්ක් එකක් ලබා දෙන්න!*");
        
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        let res = await axios.get(`https://deliri-api-ofc.vercel.app/download/tiktok?url=${q}`);
        let videoUrl = res.data.data.data.play || res.data.data.video;

        await conn.sendMessage(from, { 
            video: { url: videoUrl }, 
            caption: `*✨ SACHIYA MD TIKTOK DOWNLOADER ✨*\n\n*💫 Powered by SACHIYA-MD*` 
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        console.log(e);
        reply(`*❌ දෝෂයක් සිදු විය:* ${e.message}`);
    }
});
