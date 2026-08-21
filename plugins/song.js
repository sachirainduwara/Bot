const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

cmd({
    pattern: "song",
    alias: ["play", "audio"],
    desc: "Download songs using dynamic ytconvert API",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("⚠️ *Please provide a song name or YouTube link!*\n\n*Example:* `.song Alone`");

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        let search = await yts(q);
        let data = search.videos[0];
        if (!data) return await reply("❌ *No results found! Please try another keyword.*");

        let title = data.title;
        let duration = data.timestamp;
        let views = data.views.toLocaleString();
        let channel = data.author.name;
        let ytUrl = data.url;
        let thumbnail = data.thumbnail;

        let desc = `╭━━━〔 *SACHIYA-MD AUDIO* 〕━━━\n` +
                   `┃\n` +
                   `┃ 🎵 *Title:* ${title}\n` +
                   `┃ ⏱️ *Duration:* ${duration}\n` +
                   `┃ 👀 *Views:* ${views}\n` +
                   `┃ 🎤 *Channel:* ${channel}\n` +
                   `┃ 🔗 *Link:* ${ytUrl}\n` +
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

        const messageID = sentMsg.key.id;

        const listener = async (chatUpdate) => {
            try {
                const kay = chatUpdate.messages[0];
                if (!kay.message || !kay.key) return;
                
                const senderID = kay.key.remoteJid;
                if (senderID !== from) return;

                const contextInfo = kay.message.extendedTextMessage?.contextInfo || kay.message.conversation?.contextInfo;
                const quotedId = contextInfo?.stanzaId;
                const messageText = (kay.message.conversation || kay.message.extendedTextMessage?.text || "").trim();

                if (quotedId === messageID && ["1", "2", "3"].includes(messageText)) {
                    conn.ev.off('messages.upsert', listener);

                    await conn.sendMessage(from, { react: { text: '⬇️', key: kay.key } });

                    let audioStreamUrl = "";

                    try {
                        const headers = {
                            "Content-Type": "application/json",
                            "Origin": "https://ytmp3.gg",
                            "Referer": "https://ytmp3.gg/",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                        };

                        const payload = {
                            url: ytUrl,
                            os: "windows",
                            output: { type: "audio", format: "mp3" },
                            audio: { bitrate: "128k" }
                        };

                        let downloadResponse;
                        try {
                            downloadResponse = await axios.post("https://hub.ytconvert.org/api/download", payload, { headers });
                        } catch (err) {
                            downloadResponse = await axios.post("https://api.ytconvert.org/api/download", payload, { headers });
                        }

                        let statusUrl = downloadResponse.data.statusUrl;
                        let finalData = null;

                        while (!finalData) {
                            const statusCheck = await axios.get(statusUrl, { headers });
                            if (statusCheck.data.status === "completed" || statusCheck.data.status === "finished" || statusCheck.data.downloadUrl) {
                                finalData = statusCheck.data;
                            } else if (statusCheck.data.status === "failed") {
                                break;
                            } else {
                                await new Promise(res => setTimeout(res, 2000));
                            }
                        }

                        audioStreamUrl = finalData?.downloadUrl || "";
                    } catch (e) {
                        audioStreamUrl = "";
                    }

                    if (!audioStreamUrl) {
                        return await reply("❌ *Download failed. Conversion server is busy, please try again!*");
                    }

                    if (messageText === '1') {
                        await conn.sendMessage(from, { react: { text: '🎤', key: kay.key } });
                        await conn.sendMessage(from, { audio: { url: audioStreamUrl }, mimetype: 'audio/mp4', ptt: true }, { quoted: kay });
                    } else if (messageText === '2') {
                        await conn.sendMessage(from, { react: { text: '🎵', key: kay.key } });
                        await conn.sendMessage(from, { audio: { url: audioStreamUrl }, mimetype: 'audio/mpeg', fileName: `${title}.mp3` }, { quoted: kay });
                    } else if (messageText === '3') {
                        await conn.sendMessage(from, { react: { text: '📁', key: kay.key } });
                        await conn.sendMessage(from, { document: { url: audioStreamUrl }, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, caption: `📂 *${title}.mp3*` }, { quoted: kay });
                    }
                }
            } catch (err) {
                console.log("Error:", err);
            }
        };

        conn.ev.on('messages.upsert', listener);

    } catch (e) {
        console.log(e);
        reply(`❌ *An error occurred:* ${e.message}`);
    }
});
