const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "tiktok",
    alias: ["tt", "tik"],
    desc: "Download TikTok videos with high quality and audio.",
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

        if (!q.includes("tiktok.com")) {
            return reply("❌ *Invalid TikTok URL! Please send a correct TikTok video link.* 🔗");
        }

        // Send processing reaction
        await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } });

        let videoUrl = "";
        let audioUrl = "";
        let title = "TikTok Video";
        let author = "Unknown";
        let success = false;

        // Try API 1 (Cloudflare Worker API)
        try {
            let res1 = await axios.get(`https://tdownv4.sl-bjs.workers.dev/?down=${encodeURIComponent(q)}`, { timeout: 10000 });
            if (res1.data && (res1.data.url || res1.data.video || res1.data.nowm)) {
                videoUrl = res1.data.url || res1.data.video || res1.data.nowm;
                audioUrl = res1.data.audio || res1.data.music;
                title = res1.data.title || title;
                author = res1.data.author || author;
                success = true;
            }
        } catch (err) {
            console.log("API 1 failed, trying fallback...");
        }

        // Try API 2 (Backup API) if API 1 fails
        if (!success) {
            try {
                let res2 = await axios.get(`https://deliriussapi-oficial.vercel.app/download/tiktok?url=${encodeURIComponent(q)}`, { timeout: 10000 });
                if (res2.data && res2.data.data) {
                    videoUrl = res2.data.data.play || res2.data.data.url;
                    audioUrl = res2.data.data.music;
                    title = res2.data.data.title || title;
                    author = res2.data.data.author?.nickname || author;
                    success = true;
                }
            } catch (err) {
                console.log("API 2 failed, trying final backup...");
            }
        }

        // Try API 3 (Final Backup API)
        if (!success) {
            try {
                let res3 = await axios.get(`https://apis.davidcyriltech.my.id/tiktok?url=${encodeURIComponent(q)}`, { timeout: 10000 });
                if (res3.data && res3.data.success && res3.data.result) {
                    videoUrl = res3.data.result.video?.no_watermark || res3.data.result.video;
                    audioUrl = res3.data.result.music?.play;
                    title = res3.data.result.title || title;
                    author = res3.data.result.author?.nickname || author;
                    success = true;
                }
            } catch (err) {
                console.log("All APIs failed.");
            }
        }

        // If all APIs fail
        if (!success || !videoUrl) {
            await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
            return reply("❌ *Failed to download the video. The link might be private, deleted, or APIs are temporarily down. Try again later!* ⚠️");
        }

        // UI Caption with Emojis
        let cap = `╭━━━〔 *🎬 TIKTOK DOWNLOADER 🎵* 〕━━━\n` +
                  `┃\n` +
                  `┃ 📌 *Title:* ${title.length > 70 ? title.substring(0, 67) + '...' : title}\n` +
                  `┃ 👤 *Creator:* ${author}\n` +
                  `┃ 📥 *Status:* Successfully Downloaded! ✅\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*`;

        // Send Video HD without Watermark
        await conn.sendMessage(from, {
            video: { url: videoUrl },
            caption: cap
        }, { quoted: mek });

        // Send Audio if available
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
        console.error("TikTok Plugin Critical Error:", e);
        await conn.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply(`❌ *An unexpected error occurred:* ${e.message || e}`);
    }
});
