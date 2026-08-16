const { cmd } = require('../command');
const ytSearch = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "song",
    alias: ["play", "audio"],
    desc: "Download YouTube songs",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!q) return reply("*❌ කරුණාකර සින්දුවක නමක් හෝ YouTube ලින්ක් එකක් ලබා දෙන්න!*");
        
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
        
        let search = await ytSearch(q);
        let data = search.videos[0];
        if (!data) return reply("*❌ සින්දුව සොයාගත නොහැකි විය!*");

        let desc = `*🎵 SACHIYA MD SONG DOWNLOADER 🎵*
        
*✨ Title:* ${data.title}
*⏱️ Duration:* ${data.timestamp}
*👀 Views:* ${data.views}
*🔗 Link:* ${data.url}

*⏳ සින්දුව ඩවුන්ලෝඩ් වෙමින් පවතී, කරුණාකර රැඳී සිටින්න...*`;

        await conn.sendMessage(from, { image: { url: data.thumbnail }, caption: desc }, { quoted: mek });

        let res = await axios.get(`https://api.vyturex.com/dl/ytmp3?url=${data.url}`);
        let downloadUrl = res.data.link;

        await conn.sendMessage(from, { 
            audio: { url: downloadUrl }, 
            mimetype: 'audio/mpeg', 
            ptt: false 
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
    } catch (e) {
        console.log(e);
        reply(`*❌ දෝෂයක් සිදු විය:* ${e.message}`);
    }
});
