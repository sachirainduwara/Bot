const { cmd } = require('../command');
const fg = require('api-dylux');
const ytSearch = require('yt-search');

cmd({
    pattern: "song",
    alias: ["play", "audio"],
    desc: "Download YouTube songs with SACHIYA-MD box UI",
    category: "download",
    react: "🎶",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("*❌ Please provide a song name or YouTube link!* \n\n*Example:* `.song lelena`");
        
        // 1. Send loading react
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // 2. Search YouTube
        const search = await ytSearch(q);
        if (!search || search.videos.length === 0) {
            return await reply("*❌ No results found for your query!*");
        }

        const data = search.videos[0];
        const url = data.url;

        // 3. UI Box Design
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

        // 4. Send Thumbnail and Details
        await conn.sendMessage(from, {
            image: { url: data.thumbnail },
            caption: cap
        }, { quoted: mek });

        // 5. Fetch Audio Downloader Link
        let down = await fg.yta(url);
        if (!down || !down.dl_url) return await reply("*❌ Download failed! Try another song.*");

        // 6. Send Audio File directly
        await conn.sendMessage(from, {
            audio: { url: down.dl_url },
            mimetype: 'audio/mpeg',
            fileName: `${data.title}.mp3`
        }, { quoted: mek });

        // 7. Success React
        await conn.sendMessage(from, { react: { text: '✔', key: mek.key } });

    } catch (e) {
        console.log(e);
        await reply(`*❌ An error occurred:* ${e.message || e}`);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});
