const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "tiktok",
    alias: ["tt", "tik"],
    desc: "Download TikTok videos with video and audio in high quality.",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply, prefix, command }) => {
    try {
        if (!q) {
            return await conn.sendMessage(from, {
                text: `╭━━━〔 *✨ TIKTOK DOWNLOADER ✨* 〕━━━\n` +
                      `┃\n` +
                      `┃ ⚠️ *Please provide a TikTok link!*\n` +
                      `┃ 📌 *Example:* \`${prefix + command} https://vt.tiktok.com/ZS2xxxxxx/\`\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                      `> *⚡ Powered by SACHIYA-MD 💫*`
            }, { quoted: mek });
        }

        // Validate if it's a valid TikTok link
        if (!q.includes("tiktok.com") && !q.includes("vt.tiktok.com") && !q.includes("vm.tiktok.com")) {
            return reply("❌ *Invalid TikTok URL! Please send a correct TikTok video link.* 🔗");
        }

        // Send processing reaction & message
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        // Fetching data from reliable free API endpoint
        let response = await axios.get(`https://apis.davidcyriltech.my.id/tiktok?url=${encodeURIComponent(q)}`);
        let res = response.data;

        if (!res || !res.success || !res.result) {
            // Fallback API if primary fails
            let altRes = await axios.get(`https://deliriussapi-oficial.vercel.app/download/tiktok?url=${encodeURIComponent(q)}`);
            if (!altRes.data || (!altRes.data.data && !altRes.data.url)) {
                await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
                return reply("❌ *Failed to fetch video details. Please try again later or check the link.* ⚠️");
            }
            res = {
                result: {
                    title: altRes.data.data?.title || altRes.data.title || "TikTok Video",
                    author: { nickname: altRes.data.data?.author?.nickname || "User" },
                    video: { no_watermark: altRes.data.data?.play || altRes.data.url },
                    music: { play: altRes.data.data?.music || altRes.data.audio }
                }
            };
        }

        const data = res.result;
        const videoUrl = data.video?.no_watermark || data.video;
        const audioUrl = data.music?.play || data.audio;
        const title = data.title || "TikTok Video";
        const author = data.author?.nickname || "Unknown";

        // Beautiful UI Caption with Emojis
        let cap = `╭━━━〔 *🎬 TIKTOK DOWNLOADER 🎵* 〕━━━\n` +
                  `┃\n` +
                  `┃ 📌 *Title:* ${title.length > 80 ? title.substring(0, 77) + '...' : title}\n` +
                  `┃ 👤 *Creator:* ${author}\n` +
                  `┃ 📥 *Status:* Successfully Downloaded! ✅\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*`;

        // 1. Send Video without Watermark
        await conn.sendMessage(from, {
            video: { url: videoUrl },
            caption: cap
        }, { quoted: mek });

        // 2. Send Original Audio (Sound) automatically if available
        if (audioUrl) {
            await conn.sendMessage(from, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                ptt: false
            }, { quoted: mek });
        }

        // Success Reaction
        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.error("TikTok Download Error:", e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply(`❌ *An error occurred while downloading the video:* ${e.message || e}`);
    }
});
