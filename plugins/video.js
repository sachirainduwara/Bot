const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');

const AXIOS_DEFAULTS = {
    timeout: 60000,
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
async function getEliteProTechVideoByUrl(youtubeUrl) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp4`;
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
async function getYupraVideoByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
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
async function getOkatsuVideoByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.mp4) {
        return { download: res.data.result.mp4, title: res.data.result.title };
    }
    throw new Error('Okatsu ytmp4 returned no mp4');
}

cmd({
    pattern: "video",
    alias: ["ytv", "ytmp4", "songvideo"],
    desc: "Download YouTube Videos",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (sachiya, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!q) {
            return reply("❌ *Please provide a YouTube video title or URL!*\n\n*Example:* `.video Alan Walker Faded` or `.video https://youtu.be/...`");
        }

        let videoUrl = '';
        let videoTitle = '';
        let videoThumbnail = '';
        let videoDuration = '';
        let videoViews = '';
        let videoAuthor = '';

        if (q.startsWith('http://') || q.startsWith('https://')) {
            videoUrl = q;
        } else {
            const searchResult = await yts(q);
            const videos = searchResult?.videos;
            if (!videos || videos.length === 0) {
                return reply("❌ No videos found matching your query!");
            }
            const firstVideo = videos[0];
            videoUrl = firstVideo.url;
            videoTitle = firstVideo.title;
            videoThumbnail = firstVideo.thumbnail;
            videoDuration = firstVideo.timestamp;
            videoViews = firstVideo.views;
            videoAuthor = firstVideo.author?.name;
        }

        if (!videoTitle) {
            const searchResult = await yts(videoUrl).catch(() => null);
            if (searchResult?.videos?.[0]) {
                const firstVideo = searchResult.videos[0];
                videoTitle = firstVideo.title;
                videoThumbnail = firstVideo.thumbnail;
                videoDuration = firstVideo.timestamp;
                videoViews = firstVideo.views;
                videoAuthor = firstVideo.author?.name;
            }
        }

        const ytId = (videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
        const thumb = videoThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : '');

        // Detail Card Message with Thumbnail
        const descMsg = `╭━━━〔 *SACHIYA-MD VIDEO* 〕━━━\n` +
                        `┃\n` +
                        `┃ 📝 *Title:* ${videoTitle || q}\n` +
                        `┃ ⏱️ *Duration:* ${videoDuration || 'N/A'}\n` +
                        `┃ 👤 *Channel:* ${videoAuthor || 'N/A'}\n` +
                        `┃ 👁️ *Views:* ${videoViews ? videoViews.toLocaleString() : 'N/A'}\n` +
                        `┃ 🔗 *Url:* ${videoUrl}\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> ⏳ *Downloading video, please wait...* 🎬`;

        if (thumb) {
            await sachiya.sendMessage(from, {
                image: { url: thumb },
                caption: descMsg
            }, { quoted: mek });
        } else {
            await reply(descMsg);
        }

        // Try API methods in order (EliteProTech -> Yupra -> Okatsu)
        let videoData;
        let downloadSuccess = false;

        const apiMethods = [
            { name: 'EliteProTech', method: () => getEliteProTechVideoByUrl(videoUrl) },
            { name: 'Yupra', method: () => getYupraVideoByUrl(videoUrl) },
            { name: 'Okatsu', method: () => getOkatsuVideoByUrl(videoUrl) }
        ];

        for (const apiMethod of apiMethods) {
            try {
                videoData = await apiMethod.method();
                const downloadLink = videoData?.download || videoData?.dl || videoData?.url;
                if (downloadLink) {
                    downloadSuccess = true;
                    break;
                }
            } catch (apiErr) {
                console.log(`[VIDEO API] ${apiMethod.name} failed:`, apiErr.message || apiErr);
            }
        }

        if (!downloadSuccess || !videoData) {
            throw new Error('All download sources failed. Content may be blocked or unavailable.');
        }

        const downloadUrl = videoData.download || videoData.dl || videoData.url;
        const finalTitle = videoData.title || videoTitle || 'YouTube_Video';
        const cleanFileName = `${finalTitle.replace(/[^\w\s-]/gi, '')}.mp4`;

        const captionText = `╭━━━〔 *SACHIYA-MD DOWNLOADED* 〕━━━\n` +
                            `┃\n` +
                            `┃ 🎬 *Title:* ${finalTitle}\n` +
                            `┃ 📥 *Status:* Downloaded Successfully! ✅\n` +
                            `┃\n` +
                            `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                            `> *⚡ Powered by SACHIYA-MD 💫*`;

        // Send video directly
        await sachiya.sendMessage(from, {
            video: { url: downloadUrl },
            mimetype: 'video/mp4',
            fileName: cleanFileName,
            caption: captionText
        }, { quoted: mek });

        // Success Reaction
        await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    } catch (error) {
        console.error('[VIDEO PLUGIN ERROR]:', error?.message || error);

        let errorMessage = '❌ Failed to download video.';
        if (error.message && error.message.includes('blocked')) {
            errorMessage = '❌ Download blocked due to regional restrictions.';
        } else if (error.message && error.message.includes('All download sources failed')) {
            errorMessage = '❌ All download sources failed. Please try again later.';
        } else if (error.message) {
            errorMessage = '❌ Download Error: ' + error.message;
        }

        reply(errorMessage);
    }
});
