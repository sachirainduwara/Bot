const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    maxRedirects: 10,
    validateStatus: s => s >= 200 && s < 400,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*'
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

// EliteProTech API - Primary
async function getEliteProTechDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.downloadURL) {
        return {
            download: res.data.downloadURL,
            title: res.data.title
        };
    }
    throw new Error('EliteProTech ytdown returned no download');
}

// Yupra API - Secondary
async function getYupraDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.data?.download_url) {
        return {
            download: res.data.data.download_url,
            title: res.data.data.title,
            thumbnail: res.data.data.thumbnail
        };
    }
    throw new Error('Yupra returned no download');
}

// Okatsu API - Tertiary
async function getOkatsuDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.dl) {
        return {
            download: res.data.dl,
            title: res.data.title,
            thumbnail: res.data.thumb
        };
    }
    throw new Error('Okatsu ytmp3 returned no download');
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

        // Inform user with thumbnail & details card
        const descMsg = `╭━━━〔 *SACHIYA-MD SONG* 〕━━━\n` +
                        `┃\n` +
                        `┃ 🎵 *Title:* ${video.title}\n` +
                        `┃ ⏱️ *Duration:* ${video.timestamp}\n` +
                        `┃ 👤 *Channel:* ${video.author?.name || 'N/A'}\n` +
                        `┃ 📥 *Status:* Downloading audio... ⏳\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> *⚡ Powered by SACHIYA-MD 💫*`;

        await sachiya.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: descMsg
        }, { quoted: mek });

        let audioData;
        let downloadSuccess = false;
        let downloadUrl = '';

        const apiMethods = [
            { name: 'EliteProTech', method: () => getEliteProTechDownloadByUrl(video.url) },
            { name: 'Yupra', method: () => getYupraDownloadByUrl(video.url) },
            { name: 'Okatsu', method: () => getOkatsuDownloadByUrl(video.url) }
        ];

        for (const apiMethod of apiMethods) {
            try {
                audioData = await apiMethod.method();
                downloadUrl = audioData.download || audioData.dl || audioData.url;
                
                if (downloadUrl) {
                    downloadSuccess = true;
                    break;
                }
            } catch (apiErr) {
                console.log(`[SONG API] ${apiMethod.name} failed:`, apiErr.message);
                continue;
            }
        }

        if (!downloadSuccess || !downloadUrl) {
            throw new Error('All download sources failed.');
        }

        const finalTitle = audioData?.title || video.title || 'song';
        const cleanFileName = `${finalTitle.replace(/[^\w\s-]/gi, '')}.mp3`;

        const captionText = `╭━━━〔 *SACHIYA-MD AUDIO* 〕━━━\n` +
                            `┃\n` +
                            `┃ 🎵 *Title:* ${finalTitle}\n` +
                            `┃ 📥 *Status:* Downloaded Successfully! ✅\n` +
                            `┃\n` +
                            `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                            `> *⚡ Powered by SACHIYA-MD 💫*`;

        // Send Audio via Direct URL to prevent "audio no longer available" bug
        await sachiya.sendMessage(from, {
            audio: { url: downloadUrl },
            mimetype: 'audio/mpeg',
            fileName: cleanFileName,
            caption: captionText,
            ptt: false
        }, { quoted: mek });

        // Success Reaction
        await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    } catch (err) {
        console.error('[SONG PLUGIN ERROR]:', err?.message || err);
        reply("❌ *Failed to download the song. Please try again later!*");
    }
});
