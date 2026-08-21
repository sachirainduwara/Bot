const { cmd } = require('../command');
const ytSearch = require('yt-search');
const ytdl = require('@distube/ytdl-core'); // හෝ 'ytdl-core' (ඔබේ package.json එකේ ඇති පරිදි)

cmd({
    pattern: "song",
    alias: ["play", "audio"],
    desc: "Download YouTube songs directly without external APIs",
    category: "download",
    react: "🎶",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("*❌ Please provide a song name or YouTube link!* \n\n*Example:* `.song lelena`");
        
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // Search YouTube
        const search = await ytSearch(q);
        if (!search || search.videos.length === 0) {
            return await reply("*❌ No results found for your query!*");
        }

        const data = search.videos[0];
        const url = data.url;

        let cap = `╭━━━〔 *SACHIYA-MD AUDIO* 〕━━━┈⊷
┃
┃ 🎵 *Title:* ${data.title}
┃ ⏱️ *Duration:* ${data.timestamp}
┃ 👀 *Views:* ${data.views}
┃ 🎤 *Channel:* ${data.author.name}
┃ 🔗 *Link:* ${data.url}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

> *⚡ Powered by SACHIYA-MD 💫*`;

        // Send Thumbnail and Details
        await conn.sendMessage(from, {
            image: { url: data.thumbnail },
            caption: cap
        }, { quoted: mek });

        // Direct stream download using ytdl-core buffer (No APIs needed!)
        const stream = ytdl(url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25
        });

        // Send audio buffer directly to WhatsApp
        await conn.sendMessage(from, {
            audio: stream,
            mimetype: 'audio/mp4',
            fileName: `${data.title}.mp4`,
            ptt: false
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✔', key: mek.key } });

    } catch (e) {
        console.log(e);
        await reply(`*❌ An error occurred:* ${e.message || e}`);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});
