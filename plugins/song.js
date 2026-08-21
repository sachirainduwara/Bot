const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "song",
    alias: ["play", "audio"],
    desc: "Download songs from YouTube via OmniSave API",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("⚠️ *Please provide a song name or YouTube link!*\n\n*Example:* `.song Manike Mage Hithe`");

        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        // OmniSave API integration
        let searchApi = `https://ominisave.com/api/search?q=${encodeURIComponent(q)}`;
        let res = await axios.get(searchApi).catch(() => null);
        let songData = res && res.data ? res.data : null;

        let title = songData?.title || q;
        let duration = songData?.duration || "Unknown";
        let views = songData?.views || "N/A";
        let channel = songData?.channel || "Unknown";
        let url = songData?.url || `https://youtube.com/results?search_query=${encodeURIComponent(q)}`;
        let dl_url = songData?.dl_url || songData?.audio || ""; // API download link

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
            image: { url: "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true" }, 
            caption: desc 
        }, { quoted: mek });

        // Message Listener for the user reply (1, 2, or 3)
        const listener = async (chatUpdate) => {
            const kay = chatUpdate.messages[0];
            if (!kay.message) return;
            
            const messageType = kay.message.conversation || kay.message.extendedTextMessage?.text;
            const senderID = kay.key.remoteJid;
            const isReplyToBot = kay.message.extendedTextMessage && kay.message.extendedTextMessage.contextInfo.stanzaId === sentMsg.key.id;

            if (isReplyToBot && senderID === from) {
                // Remove listener once processed to prevent memory leaks
                conn.ev.off('messages.upsert', listener);

                if (messageType === '1') {
                    await conn.sendMessage(from, { react: { text: '🎤', key: kay.key } });
                    await conn.sendMessage(from, { audio: { url: dl_url }, mimetype: 'audio/mp4', ptt: true }, { quoted: kay });
                } else if (messageType === '2') {
                    await conn.sendMessage(from, { react: { text: '🎵', key: kay.key } });
                    await conn.sendMessage(from, { audio: { url: dl_url }, mimetype: 'audio/mpeg', fileName: `${title}.mp3` }, { quoted: kay });
                } else if (messageType === '3') {
                    await conn.sendMessage(from, { react: { text: '📁', key: kay.key } });
                    await conn.sendMessage(from, { document: { url: dl_url }, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, caption: `📂 *${title}.mp3*` }, { quoted: kay });
                }
            }
        };

        conn.ev.on('messages.upsert', listener);

    } catch (e) {
        console.log(e);
        reply(`❌ *An error occurred:* ${e.message}`);
    }
});
