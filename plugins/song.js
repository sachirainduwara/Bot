const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
    maxRedirects: 10,
    validateStatus: s => s >= 200 && s < 400,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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

// Reliable Public Download Endpoints
async function getApiDl(youtubeUrl) {
    const apis = [
        `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`,
        `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`,
        `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`
    ];

    for (const apiUrl of apis) {
        try {
            const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS), 2);
            let downloadUrl = '';
            let title = '';

            if (res?.data?.success && res?.data?.data?.download_url) {
                downloadUrl = res.data.data.download_url;
                title = res.data.data.title;
            } else if (res?.data?.dl) {
                downloadUrl = res.data.dl;
                title = res.data.title;
            } else if (res?.data?.success && res?.data?.downloadURL) {
                downloadUrl = res.data.downloadURL;
                title = res.data.title;
            }

            if (downloadUrl) {
                return { download: downloadUrl, title: title };
            }
        } catch (e) {
            continue;
        }
    }
    throw new Error('All download endpoints failed.');
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
        const descMsg = "╭━━━〔 *SACHIYA-MD SONG* 〕━━━\n" +
                        "┃\n" +
                        "┃ 🎵 *Title:* " + video.title + "\n" +
                        "┃ ⏱️ *Duration:* " + video.timestamp + "\n" +
                        "┃ 👤 *Channel:* " + (video.author?.name || 'N/A') + "\n" +
                        "┃ 📥 *Status:* Downloading Audio... ⏳\n" +
                        "┃\n" +
                        "╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                        "> *⚡ Powered by SACHIYA-MD 💫*";

        await sachiya.sendMessage(from, {
            image: { url: video.thumbnail },
            caption: descMsg
        }, { quoted: mek });

        const audioData = await getApiDl(video.url);
        if (!audioData || !audioData.download) {
            return reply("❌ *Failed to fetch download link. Please try again later!*");
        }

        const audioResponse = await axios.get(audioData.download, {
            responseType: 'arraybuffer',
            timeout: 90000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': '*/*'
            }
        });

        const audioBuffer = Buffer.from(audioResponse.data);
        if (!audioBuffer || audioBuffer.length < 10000) {
            return reply("❌ *Downloaded audio file is invalid. Please try another song!*");
        }

        const cleanTitle = (audioData.title || video.title || 'song').replace(/[^\w\s-]/gi, '');
        const captionText = "🎵 *" + cleanTitle + "*\n\n> *⚡ Powered by SACHIYA-MD 💫*";

        // Send as Document MP3 (Ensures 100% compatibility across Android, iOS, and Web without any format or player errors)
        await sachiya.sendMessage(from, {
            document: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: cleanTitle + '.mp3',
            caption: captionText
        }, { quoted: mek });

        // Success Reaction
        await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    } catch (err) {
        console.error('[SONG COMMAND ERROR]:', err);
        reply("❌ *Failed to download the song. All servers are currently busy!*");
    }
});
