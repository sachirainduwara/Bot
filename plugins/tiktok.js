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

        let response = await axios.get(`https://api.tikwm.com/api/?url=${encodeURIComponent(q)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        let res = response.data;
        if (!res || !res.data || !res.data.play) {
            return reply("*❌ වීඩියෝව ලබා ගැනීමට නොහැකි විය. කරුණාකර ලින්ක් එක පරීක්ෂා කරන්න!*");
        }

        let videoUrl = res.data.hdplay || res.data.play;
        let title = res.data.title || "TikTok Video";
        let author = res.data.author.nickname || "Unknown";

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
