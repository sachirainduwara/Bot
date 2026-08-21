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
        
        await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });

        const search = await ytSearch(q);
        if (!search || search.videos.length === 0) {
            return await reply("*❌ No results found for your query!*");
        }

        const data = search.videos[0];
        const url = data.url;

        // Advanced Box UI requested by you
        let cap = `╭━━━〔 *SACHIYA-MD AUDIO* 〕━━━┈⊷
┃
┃ 🎵 *Title:* ${data.title}
┃ ⏱️ *Duration:* ${data.timestamp}
┃ 👀 *Views:* ${data.views}
┃ 🎤 *Channel:* ${data.author.name}
┃ 🔗 *Link:* ${data.url}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━┈⊷

═ 🔢 *REPLY WITH NUMBER* ═

01 ❯❯ *AUDIO (MP3)* 🎧
02 ❯❯ *DOCUMENT (File)* 📁
03 ❯❯ *VOICE NOTE (PTT)* 🎤

> *⚡ Powered by SACHIYA-MD 💫*`;

        const sentMsg = await conn.sendMessage(from, {
            image: { url: data.thumbnail },
            caption: cap
        }, { quoted: mek });

        const messageID = sentMsg.key.id;

        // Number reply listener
        conn.ev.on('messages.upsert', async (chatUpdate) => {
            const mek_reply = chatUpdate.messages[0];
            if (!mek_reply.message) return;
            
            const messageType = mek_reply.message.conversation || mek_reply.message.extendedTextMessage?.text;
            const sender = mek_reply.key.remoteJid;
            const isReplyToMe = mek_reply.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;
            
            if (isReplyToMe && sender === from) {
                if (messageType === '1' || messageType === '01') {
                    await conn.sendMessage(from, { react: { text: '⬇️', key: mek_reply.key } });
                    let down = await fg.yta(url);
                    if (!down || !down.dl_url) return await reply("❌ *Download failed!*");
                    
                    await conn.sendMessage(from, {
                        audio: { url: down.dl_url },
                        mimetype: 'audio/mpeg',
                        fileName: `${data.title}.mp3`
                    }, { quoted: mek_reply });
                    await conn.sendMessage(from, { react: { text: '✔', key: mek_reply.key } });
                } 
                else if (messageType === '2' || messageType === '02') {
                    await conn.sendMessage(from, { react: { text: '⬇️', key: mek_reply.key } });
                    let down = await fg.yta(url);
                    if (!down || !down.dl_url) return await reply("❌ *Download failed!*");
                    
                    await conn.sendMessage(from, {
                        document: { url: down.dl_url },
                        mimetype: 'audio/mpeg',
                        fileName: `${data.title}.mp3`,
                        caption: `*🎵 ${data.title}* \n*⚡ Powered by SACHIYA-MD 💫*`
                    }, { quoted: mek_reply });
                    await conn.sendMessage(from, { react: { text: '✔', key: mek_reply.key } });
                } 
                else if (messageType === '3' || messageType === '03') {
                    await conn.sendMessage(from, { react: { text: '⬇️', key: mek_reply.key } });
                    let down = await fg.yta(url);
                    if (!down || !down.dl_url) return await reply("❌ *Download failed!*");
                    
                    await conn.sendMessage(from, {
                        audio: { url: down.dl_url },
                        mimetype: 'audio/mp4',
                        ptt: true
                    }, { quoted: mek_reply });
                    await conn.sendMessage(from, { react: { text: '✔', key: mek_reply.key } });
                }
            }
        });

        await conn.sendMessage(from, { react: { text: '✔', key: mek.key } });

    } catch (e) {
        console.log(e);
        await reply(`*❌ An error occurred:* ${e.message || e}`);
    }
});
