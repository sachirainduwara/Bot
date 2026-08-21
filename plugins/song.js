const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

cmd({
    pattern: "song",
    alias: ["play", "audio"],
    desc: "Download songs using multi-fallback custom APIs",
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
                
                // Trying API 1 (gammacloud primary signature format)
                try {
                    let apiRes1 = await axios.get(`https://cccoco.gammacloud.net/api/v1/download?sig=mh5wgWTea0W50lQF8Fr7IFiPxCkbUNc7LrlS0B0nKxB1Ko0KOTxNwEbRQ2ETIrCfJtpRD9jbcBm1KxMw48Jnk8GyA8L7KMqmcKtOe3TW%2F4TqV3kQ0XsQWTevIErLVzPRAxWOjvCoTtc9BMXSjY2YaAWUyAXblCmYhC8qiyn2sDn6WMkTf0JjknflgU8z5Rt7Y23HA3ZDJMdNYVBZCtgtgeaSWBTw5XxyxK5a8L32a9GHGJTVMJAfpTaDw5uIQsfwbsaQqK1HS3v3sPU%2F6dMQPlWwGl7WKQN4CVUByaQLUbRUD0DyRcr6Sj7YUoxuoaVWJKAJJVmzu9ngejCT%2FYi20Q%3D%3D&r=ytmp3.gl`);
                    audioStreamUrl = apiRes1.data?.result?.downloadLink || apiRes1.data?.downloadLink || "";
                } catch (err1) {
                    audioStreamUrl = "";
                }

                // If API 1 fails, falling back to API 2
                if (!audioStreamUrl) {
                    try {
                        let apiRes2 = await axios.get(`https://ococoo.gammacloud.net/api/v1/download?sig=gZPH1eCN%2FLX5lCY72ZaCYfpwet2rJjuOO6P4NPI%2BVhvK9vkIMZGx55xIRzAWas5P3GIYxgl%2B6e6BWtBMzXctB9NEBOc8EcsULvFdVUcbSNEezSicfCtK4muPLViHjcVNvtpOxuHbtsDRJHLhzod1QICPlWTW9VvA8vhJ0duDR15jCDd4ga9rM72f%2BmO5hVhlvurcLWsMn%2BQmmZ%2BVz2EE91AkwD6VANH4%2BeQaY0FsDP72xGjrgFPt0h8hQpdAqqioeGp5bGr9JJfiFb2BGIAvjIfRcUNd2pD9tkRwJtiOTSQzv4lLEOomivaIc%2FxoLIxaERxTDF40QhQhz4S65MC43g%3D%3D&r=ytmp3.gl`);
                        audioStreamUrl = apiRes2.data?.result?.downloadURL || apiRes2.data?.downloadURL || "";
                    } catch (err2) {
                        audioStreamUrl = "";
                    }
                }

                // If API 2 fails, falling back to API 3
                if (!audioStreamUrl) {
                    try {
                        let apiRes3 = await axios.get(`https://ococoo.gammacloud.net/api/v1/download?sig=Jg7so%2F%2FTjQy6a21N%2Bv7d2w7d6xB%2BzgKyrNs6lz3SlV6sfRW546r3RdCPMmhl05Od2pkVToF5zGU9zDl1L%2BdQz%2F8LBw8emg5Wks4WSAKEDkiCZqZSKnkt3hlSsW%2FlaDfUu0azoMBPQkVRhEceAptbmjwR2gjKO0tNEf152qEd4e0feg7WBrTVFSj6pfKigQjrLJ%2B2BnLfhjitRepaZbJk5YqBRAeisD%2FyYJjS7q3V%2FBPPQt6xirZw55co63C4Z7ab7YJxATyAbY3fBPDher5OvB2%2BdamQW5Oa2LfqzzZNWuiPYNj%2F%2B%2FFJbHBtH3EC2XlyCtUDMDZZnW6Ts8oTtvy97A%3D%3D&r=ytmp3.gl`);
                        audioStreamUrl = apiRes3.data?.result?.downloadURL || apiRes3.data?.downloadURL || "";
                    } catch (err3) {
                        audioStreamUrl = url; // final fallback to youtube url
                    }
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
