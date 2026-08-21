const { cmd } = require('../command');
const ytSearch = require('yt-search');
const axios = require('axios');

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
        
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

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

        await conn.sendMessage(from, {
            image: { url: data.thumbnail },
            caption: cap
        }, { quoted: mek });

        // Using a reliable public API endpoint to bypass 403 errors
        let apiUrl = `https://api.davidcyriltech.my.id/download/ytmp3?url=${url}`;
        let response = await axios.get(apiUrl);
        
        if (!response.data || !response.data.success || !response.data.result.downloadUrl) {
            // Fallback API if first fails
            apiUrl = `https://api.siputzx.my.id/api/d/ytmp3?url=${url}`;
            response = await axios.get(apiUrl);
        }

        const downloadUrl = response.data.result?.downloadUrl || response.data.data?.dl || response.data.result?.dl;

        if (!downloadUrl) {
            return await reply("*❌ Download failed due to API restriction. Try another song!*");
        }

        // Send Audio File
        await conn.sendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            fileName: `${data.title}.mp3`
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: '✔', key: mek.key } });

    } catch (e) {
        console.log(e);
        await reply(`*❌ An error occurred:* ${e.message || e}`);
        await conn.sendMessage(from, { react: { text: '❌', key: mek.key } });
    }
});
