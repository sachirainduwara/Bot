const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

cmd({
    pattern: "song",
    alias: ["play", "audio"],
    desc: "Download songs using multi custom APIs with fallback",
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

        const messageID = sentMsg.key.id;

        // Secure listener to handle options 1, 2, 3
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

                    // උඹ දුන්න API 3 පිළිවෙළට array එකට දාලා තියෙන්නේ
                    const apiEndpoints = [
                        // API 3 (ococoo - downloadURL)
                        `https://ococoo.gammacloud.net/api/v1/download?sig=cr5hKTEyioW1ilSCsepPl1zKHYBnGpam2MHw9ALLQrVS4r4WK8%2BvKO2Tr2Oo5x%2B9zGorLfVjOyPhG0W1NrVoKWqT2L2dhC%2Bw%2BlPXwnucGYbHWtkhHH%2BoqNzmDc0F18PLVYcvTYcAMrvoRh1%2BnJFE5rlOFXqCT6rukHjeDEs%2BhLp8QXdFXWEw6thUWZ6xakvqP6Qd3J6WuU4CMMmBbOS%2Befobpxn1i87rUQFa2O4sXCk97l83FHuy9MoD1pOr8GBK0whI2NBqxb8PkgomqsAR%2BgupsNWL9%2BE63lZwEHAKVTbwk8DPZpKSm%2FsyUQWepBeDMofQ6S0%2FusqflXIZIOC0HA%3D%3D&r=ytmp3.gl`,
                        // API 2 (cccoco - downloadLink)
                        `https://cccoco.gammacloud.net/api/v1/download?sig=q9YXuTf6cWka30JWixpv837X%2BUX6b0qMeex3bt2uQdfsNK2E2FLS%2FD2AKCDvol%2F4EfDmu5X3me8bnKfQPExEoBvsEC6eidb9HIIsk3uyqWWaAgV9fIdAYd63kkk260ACbfM389aZxNwi8pVfN4z3k4dcLw9xscjOzd2PN4Am7yjWCwG%2BDSstcr4w%2FVtDVGIukrITesc3B%2BnNaJnS7BXlu64Y7PJifMt9SNpvB3MuAH%2Bk7riCunzuwE1J0hV8AdCaVf2ILiuPGM1cDVEVoWLxsAmMJKDjO9VzL4OPCxbH%2Fiz8y3eKPRMMsFweAFIpP9ZU31q3RBo81hRg5n7TSdA0JA%3D%3D&r=ytmp3.gl`
                    ];

                    // Loop එකෙන් එකින් එක ට්‍රයි කරයි (Cloudflare බ්ලොක් වන ඒවා මඟහැරී වැඩ කරන එක අල්ල ගනියයි)
                    for (let api of apiEndpoints) {
                        try {
                            let res = await axios.get(api);
                            // JSON එකේ එන විදිහට downloadURL හෝ downloadLink පරීක්ෂා කරයි
                            audioStreamUrl = res.data?.result?.downloadURL || res.data?.result?.downloadLink || "";
                            if (audioStreamUrl && typeof audioStreamUrl === 'string' && audioStreamUrl.startsWith('http')) {
                                break; 
                            }
                        } catch (err) {
                            continue;
                        }
                    }

                    if (!audioStreamUrl) {
                        return await reply("❌ *Download failed. All APIs are blocked or busy!*");
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
