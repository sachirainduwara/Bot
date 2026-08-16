const { cmd } = require('../command');
const ytSearch = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "video",
    alias: ["ytmp4", "mp4"],
    desc: "Download YouTube videos",
    category: "download",
    react: "🎥",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!q) return reply("*❌ කරුණාකර වීඩියෝවක නමක් හෝ YouTube ලින්ක් එකක් ලබා දෙන්න!*");
        
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        
        let search = await ytSearch(q);
        let data = search.videos[0];
        if (!data) return reply("*❌ වීඩියෝව සොයාගත නොහැකි විය!*");

        let desc = `*🎥 SACHIYA MD VIDEO DOWNLOADER 🎥*
        
*✨ Title:* ${data.title}
*⏱️ Duration:* ${data.timestamp}
*👀 Views:* ${data.views}
*🔗 Link:* ${data.url}

*⏳ වීඩියෝව ඩවුන්ලෝඩ් වෙමින් පවතී, කරුණාකර රැඳී සිටින්න...*`;

        await conn.sendMessage(from, { image: { url: data.thumbnail }, caption: desc }, { quoted: mek });

        let res = await axios.get(`https://api.vyturex.com/dl/ytmp4?url=${data.url}`);
        let downloadUrl = res.data.link;

        await conn.sendMessage(from, { 
            video: { url: downloadUrl }, 
            mimetype: 'video/mp4',
            caption: `*🎬 SACHIYA MD 💫*`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        console.log(e);
        reply(`*❌ දෝෂයක් සිදු විය:* ${e.message}`);
    }
});
