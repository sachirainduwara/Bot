const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    maxRedirects: 10,
    validateStatus: s => s >= 200 && s < 400,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*'
    }
};

async function tryRequest(getter, attempts = 3) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await getter();
        } catch (err) {
            lastError = err;
            if (attempt < attempts) {
                await new Promise(r => setTimeout(r, 1000 * attempt));
            }
        }
    }
    throw lastError;
}

// 1. Dark Yasiya / Ytdl Working Direct API
async function getDarkYasiyaDl(youtubeUrl) {
    const apiUrl = `https://api.dark-yasiya.api.sri-server.com/download/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.status && res?.data?.result?.dl_link) {
        return {
            download: res.data.result.dl_link,
            title: res.data.result.title
        };
    }
    throw new Error('DarkYasiya API failed');
}

// 2. EliteProTech API
async function getEliteProTechDl(youtubeUrl) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.downloadURL) {
        return {
            download: res.data.downloadURL,
            title: res.data.title
        };
    }
    throw new Error('EliteProTech API failed');
}

// 3. Okatsu API
async function getOkatsuDl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.dl) {
        return {
            download: res.data.dl,
            title: res.data.title
        };
    }
    throw new Error('Okatsu API failed');
}

cmd({
    pattern: "song",
    alias: ["play", "ytmp3"],
    desc: "Download YouTube Audio",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (sachiya, mek, m, { from, quoted, q, reply }) => {
    try {
        if (!q) {
            return reply("❌ *Please provide a song name or YouTube link!*\n\n*Example:* `.song Manike Mage Hithe`");
        }

        let video;
        if (q.startsWith('http://') || q.startsWith('https://')) {
            const ytId = (q.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
            if (!ytId) return reply("❌ Invalid YouTube link!");
            const search = await yts({ videoId: ytId });
            video = search;
        } else {
            const search = await yts(q);
            if (!search || !search.videos.length) {
                return reply("❌ No results found matching your query!");
            }
            video = search.videos[0];
        }

        // Send Card Info First
        const descMsg = `╭━━━〔 *SACHIYA-MD SONG* 〕━━━\n` +
                        `┃\n` +
                        `┃ 🎵 *Title:* ${video.title}\n` +
                        `┃ ⏱️ *Duration:* ${video.timestamp}\n` +
                        `┃ 👤 *Channel:* ${video.author?.name || 'N/A'}\n` +
                        `┃ 📥 *Status:* Downloading Audio... ⏳\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> *⚡ Powered by SACHIYA-MD 💫*`;

        await sachiya.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: descMsg
        }, { quoted: mek });

        let audioData;
        let audioBuffer;
        let downloadSuccess = false;

        const apiList = [
            getDarkYasiyaDl,
            getEliteProTechDl,
            getOkatsuDl
        ];

        for (const getDl of apiList) {
            try {
                audioData = await getDl(video.url);
                const dlUrl = audioData.download;
                if (!dlUrl) continue;

                // Download Stream as Buffer
                const res = await axios.get(dlUrl, {
                    responseType: 'arraybuffer',
                    timeout: 90000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                        'Accept': '*/*'
                    }
                });

                audioBuffer = Buffer.from(res.data);
                if (audioBuffer && audioBuffer.length > 10000) {
                    downloadSuccess = true;
                    break;
                }
            } catch (err) {
                console.log("[SONG DL ERROR]:", err.message);
                continue;
            }
        }

        if (!downloadSuccess || !audioBuffer) {
            return reply("❌ *Failed to fetch song from servers. Please try again!*");
        }

        const cleanTitle = (audioData?.title || video.title || 'song').replace(/[^\w\s-]/gi, '');

        // 1. Send as Playable WhatsApp Audio (WITHOUT CAPTION - Crucial for WhatsApp Audio Player)
        await sachiya.sendMessage(from, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false
        }, { quoted: mek });

        // 2. Send as Document (MP3 File) as Backup so user can download directly
        await sachiya.sendMessage(from, {
            document: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${cleanTitle}.mp3`,
            caption: `🎵 *${cleanTitle}*\n\n> *⚡ Powered by SACHIYA-MD 💫*`
        }, { quoted: mek });

        // React Success
        await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    } catch (err) {
        console.error('[SONG COMMAND ERROR]:', err);
        reply("❌ *An error occurred while processing your request!*");
    }
});
