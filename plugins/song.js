const { cmd } = require('../command');
const ytSearch = require('yt-search');
const axios = require('axios');

cmd({
    pattern: "song",
    alias: ["play", "audio"],
    desc: "Download YouTube songs universally playable on all devices",
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

        // Using a stable working media endpoint to fetch direct stream buffer
        let apiUrl = `https://api.siputzx.my.id/api/d/ytmp3?url=${url}`;
        let res = await axios.get(apiUrl).catch(() => null);
        
        let downloadUrl = res?.data?.data?.dl || res?.data?.result?.dl || res?.data?.dl;

        if (!downloadUrl) {
            // Backup stable endpoint
            let apiUrl2 = `https://Widipe.com/downloader/ytmp3?url=${url}`;
            let res2 = await axios.get(apiUrl2).catch(() => null);
            downloadUrl = res2?.data?.result?.url || res2?.data?.url;
        }

        if (!downloadUrl) {
            return await reply("*❌ Download failed! Please try again with a different song.*");
        }

        // Send audio as audio/mp4 with ptt: false so it acts like a normal playable/shareable audio file on all devices
        await conn.sendMessage(from, {
            audio: { url: downloadUrl },
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
