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
        if (!q || !q.includes('tiktok.com')) return reply("*❌ කරුණාකර නිවැරදි TikTok ලින්ක් එකක් ලබා දෙන්න!*");
        
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        let res = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(q)}`);
        
        if (!res.data || !res.data.data || !res.data.data.play) {
            return reply("*❌ වීඩියෝව ඩවුන්ලෝඩ් කරගත නොහැකි විය. කරුණාකර වෙනත් ලින්ක් එකක් උත්සාහ කරන්න!*");
        }

        let videoUrl = res.data.data.play;
        let title = res.data.data.title || "TikTok Video";
        let author = res.data.data.author.nickname || "Unknown";

        let caption = `*✨ SACHIYA MD TIKTOK DOWNLOADER ✨*

*📝 Title:* ${title}
*👤 Author:* ${author}

*💫 Powered by SACHIYA-MD*`;

        await conn.sendMessage(from, { 
            video: { url: videoUrl }, 
            caption: caption 
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        console.log(e);
        reply(`*❌ දෝෂයක් සිදු විය:* ${e.message}`);
    }
});
