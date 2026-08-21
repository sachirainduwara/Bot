const { cmd } = require('../command');
const fg = require('api-dylux');
const ytSearch = require('yt-search');

cmd({
    pattern: "song",
    desc: "Download YouTube songs",
    category: "download",
    react: "🎶",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return await reply("*❌ Please provide a song name!*");
        
        const search = await ytSearch(q);
        if (!search.videos[0]) return await reply("*❌ Not found!*");
        const data = search.videos[0];

        let menu = `╭━━━〔 *SACHIYA-MD AUDIO* 〕━━━
┃ 🎵 *Title:* ${data.title}
┃ ⏱️ *Duration:* ${data.timestamp}
┃ 🔗 *Link:* ${data.url}
╰━━━━━━━━━━━━━━━━━━━

*පහත සඳහන් අංකය reply කරන්න:*
1 ❯❯ *Download as Audio (MP3)*
2 ❯❯ *Download as Document (File)*
3 ❯❯ *Download as Voice (PTT)*

> *⚡ Powered by SACHIYA-MD 💫*`;

        const sentMsg = await conn.sendMessage(from, { image: { url: data.thumbnail }, caption: menu }, { quoted: mek });
        
        // මේක මගින් බොට් එකට මතක තියාගන්න පුළුවන් මේ සින්දුවට ලැබෙන reply එක මොකක්ද කියලා
        global.yt_data = global.yt_data || {};
        global.yt_data[sentMsg.key.id] = { url: data.url, title: data.title };

    } catch (e) {
        reply("Error: " + e);
    }
});

// වෙනම listeners ගොඩක් නැතිව එකම තැනකින් හැම එකම පාලනය කිරීමට:
conn.ev.on('messages.upsert', async (msg) => {
    const m = msg.messages[0];
    if (!m.message || !m.message.extendedTextMessage) return;
    
    const contextInfo = m.message.extendedTextMessage.contextInfo;
    const replyText = m.message.extendedTextMessage.text;
    
    if (contextInfo && global.yt_data && global.yt_data[contextInfo.stanzaId]) {
        const { url, title } = global.yt_data[contextInfo.stanzaId];
        const from = m.key.remoteJid;
        
        if (replyText === '1') {
            await conn.sendMessage(from, { react: { text: '⬇️', key: m.key } });
            let down = await fg.yta(url);
            await conn.sendMessage(from, { audio: { url: down.dl_url }, mimetype: 'audio/mpeg' }, { quoted: m });
        } 
        else if (replyText === '2') {
            await conn.sendMessage(from, { react: { text: '⬇️', key: m.key } });
            let down = await fg.yta(url);
            await conn.sendMessage(from, { document: { url: down.dl_url }, mimetype: 'audio/mpeg', fileName: `${title}.mp3` }, { quoted: m });
        }
        else if (replyText === '3') {
            await conn.sendMessage(from, { react: { text: '⬇️', key: m.key } });
            let down = await fg.yta(url);
            await conn.sendMessage(from, { audio: { url: down.dl_url }, mimetype: 'audio/mp4', ptt: true }, { quoted: m });
        }
        
        // වැඩේ ඉවර වුණාම memory එකෙන් අයින් කරන්න
        delete global.yt_data[contextInfo.stanzaId];
    }
});
