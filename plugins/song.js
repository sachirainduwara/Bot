const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

cmd({
    pattern: "song",
    alias: ["play", "audio"],
    desc: "Download songs using custom API",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("⚠️ *Please provide a song name or YouTube link!*\n\n*Example:* `.song Huttho`");

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // Search YouTube for real video details
        let search = await yts(q);
        let data = search.videos[0];
        if (!data) return await reply("❌ *No results found! Please try another keyword.*");

        let title = data.title;
        let duration = data.timestamp;
        let views = data.views.toLocaleString();
        let channel = data.author.name;
        let url = data.url;
        let thumbnail = data.thumbnail;

        // Clean UI Box Design
        let desc = `╭━━━〔 *SACHIYA-MD AUDIO* 〕━━━\n` +
                   `┃\n` +
                   `┃ 🎵 *Title:* ${title}\n` +
                   `┃ ⏱️ *Duration:* ${duration}\n` +
                   `┃ 👀 *Views:* ${views}\n` +
                   `┃ 🎤 *Channel:* ${channel}\n` +
                   `┃ 🔗 *Link:* ${url}\n` +
                   `┃\n` +
                   `╰━━━━━━━━━━━━━━━━━━\n\n` +
                   `1️⃣ *Voice Note (PTT)*\n` +
                   `2️⃣ *Audio MP3*\n` +
                   `3️⃣ *Document File*\n\n` +
                   `> *⚡ Powered by SACHIYA-MD 💫*`;

        const sentMsg = await conn.sendMessage(from, { 
            image: { url: thumbnail }, 
            caption: desc 
        }, { quoted: mek });

        // Listener for handling 1, 2, 3 replies securely
        const listener = async (chatUpdate) => {
            const kay = chatUpdate.messages[0];
            if (!kay.message) return;
            
            const messageType = kay.message.conversation || kay.message.extendedTextMessage?.text;
            const senderID = kay.key.remoteJid;
            const isReplyToBot = kay.message.extendedTextMessage && kay.message.extendedTextMessage.contextInfo.stanzaId === sentMsg.key.id;

            if (isReplyToBot && senderID === from) {
                conn.ev.off('messages.upsert', listener);

                let audioStreamUrl = "";
                try {
                    // Fetching directly from the API endpoint using the video url search
                    let apiRes = await axios.get(`https://cccoco.gammacloud.net/api/v1/download?sig=mh5wgWTea0W50lQF8Fr7IFiPxCkbUNc7LrlS0B0nKxB1Ko0KOTxNwEbRQ2ETIrCfJtpRD9jbcBm1KxMw48Jnk8GyA8L7KMqmcKtOe3TW%2F4TqV3kQ0XsQWTevIErLVzPRAxWOjvCoTtc9BMXSjY2YaAWUyAXblCmYhC8qiyn2sDn6WMkTf0JjknflgU8z5Rt7Y23HA3ZDJMdNYVBZCtgtgeaSWBTw5XxyxK5a8L32a9GHGJTVMJAfpTaDw5uIQsfwbsaQqK1HS3v3sPU%2F6dMQPlWwGl7WKQN4CVUByaQLUbRUD0DyRcr6Sj7YUoxuoaVWJKAJJVmzu9ngejCT%2FYi20Q%3D%3D&r=ytmp3.gl`);
                    
                    // Extracting the downloadLink precisely based on your provided JSON schema
                    audioStreamUrl = apiRes.data?.result?.downloadLink || apiRes.data?.downloadLink || "";
                } catch (err) {
                    // Fallback to video url if any issue occurs
                    audioStreamUrl = url;
                }

                if (!audioStreamUrl) {
                    return await reply("❌ *Download failed. Please try again!*");
                }

                if (messageType === '1') {
                    await conn.sendMessage(from, { react: { text: '🎤', key: kay.key } });
                    await conn.sendMessage(from, { audio: { url: audioStreamUrl }, mimetype: 'audio/mp4', ptt: true }, { quoted: kay });
                } else if (messageType === '2') {
                    await conn.sendMessage(from, { react: { text: '🎵', key: kay.key } });
                    await conn.sendMessage(from, { audio: { url: audioStreamUrl }, mimetype: 'audio/mpeg', fileName: `${title}.mp3` }, { quoted: kay });
                } else if (messageType === '3') {
                    await conn.sendMessage(from, { react: { text: '📁', key: kay.key } });
                    await conn.sendMessage(from, { document: { url: audioStreamUrl }, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, caption: `📂 *${title}.mp3*` }, { quoted: kay });
                }
            }
        };

        conn.ev.on('messages.upsert', listener);

    } catch (e) {
        console.log(e);
        reply(`❌ *An error occurred:* ${e.message}`);
    }
});
