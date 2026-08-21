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
        let videoSeconds = 0;

        if (q.startsWith('http://') || q.startsWith('https://')) {
            videoUrl = q;
            try {
                const match = q.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
                if (match && match[1]) {
                    const searchResult = await yts({ videoId: match[1] });
                    if (searchResult) {
                        videoTitle = searchResult.title;
                        videoThumbnail = searchResult.thumbnail;
                        videoDuration = searchResult.timestamp;
                        videoViews = searchResult.views;
                        videoAuthor = searchResult.author?.name;
                        videoSeconds = searchResult.seconds;
                    }
                }
            } catch (err) {}
        } 
        
        if (!videoTitle) {
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
            videoSeconds = firstVideo.seconds;
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
                videoSeconds = firstVideo.seconds;
            }
        }

        // ⏱️ Check if video duration is less than 6 hours (6 * 3600 = 21600 seconds)
        if (videoSeconds > 21600) {
            await sachiya.sendMessage(from, { react: { text: "⚠️", key: mek.key } }).catch(() => {});
            return reply(`❌ *Video is too long!* \n\n⏱ *Duration:* ${videoDuration}\n⚠️ *Please select a video shorter than 6 hours (Max 6 hours allowed).*`);
        }

        const ytId = (videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
        const thumb = videoThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : '');

        // Detail Card Message with Format Selection Options
        const descMsg = `╭━━━〔 *SACHIYA-MD VIDEO* 〕━━━\n` +
                        `┃\n` +
                        `┃ 📝 *Title:* ${videoTitle || q}\n` +
                        `┃ ⏱️ *Duration:* ${videoDuration || 'N/A'}\n` +
                        `┃ 👤 *Channel:* ${videoAuthor || 'N/A'}\n` +
                        `┃ 👁️ *Views:* ${videoViews ? videoViews.toLocaleString() : 'N/A'}\n` +
                        `┃ 🔗 *Url:* ${videoUrl}\n` +
                        `┃\n` +
                        `┣━━━〔 *SELECT FORMAT* 〕━━━\n` +
                        `┃\n` +
                        `┃ 1️⃣ *MP4 Video Format*\n` +
                        `┃ 2️⃣ *Document File Format*\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> 💬 *Please reply with 1 for MP4 Video or 2 for Document!*`;

        let sentMsg;
        if (thumb) {
            sentMsg = await sachiya.sendMessage(from, {
                image: { url: thumb },
                caption: descMsg
            }, { quoted: mek });
        } else {
            sentMsg = await reply(descMsg);
        }

        await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

        // 🎛️ Listen for user's choice response (1 or 2)
        const messageListener = async (chatUpdate) => {
            try {
                const msg = chatUpdate.messages[0];
                if (!msg || !msg.message) return;
                
                const msgSender = msg.key.remoteJid;
                const isReplyToBot = msg.message.extendedTextMessage && 
                                   msg.message.extendedTextMessage.contextInfo && 
                                   msg.message.extendedTextMessage.contextInfo.stanzaId === sentMsg.key.id;

                if (msgSender === from && isReplyToBot) {
                    const choiceText = (msg.message.conversation || msg.message.extendedTextMessage.text || "").trim();

                    if (!["1", "2"].includes(choiceText)) {
                        return; // Ignore other inputs
                    }

                    // Remove listener once choice is made
                    sachiya.ev.off("messages.upsert", messageListener);

                    await sachiya.sendMessage(from, { react: { text: "📥", key: msg.key } }).catch(() => {});

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
                        await sachiya.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => {});
                        return reply("❌ *All download sources failed. Please try again later.*");
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

                    if (choiceText === '1') {
                        await sachiya.sendMessage(from, { react: { text: "🎬", key: msg.key } }).catch(() => {});
                        await sachiya.sendMessage(from, {
                            video: { url: downloadUrl },
                            mimetype: 'video/mp4',
                            fileName: cleanFileName,
                            caption: captionText
                        }, { quoted: msg });
                    } else if (choiceText === '2') {
                        await sachiya.sendMessage(from, { react: { text: "📁", key: msg.key } }).catch(() => {});
                        await sachiya.sendMessage(from, {
                            document: { url: downloadUrl },
                            mimetype: 'video/mp4',
                            fileName: cleanFileName,
                            caption: captionText
                        }, { quoted: msg });
                    }

                    // Success Reaction
                    await sachiya.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
                }
            } catch (err) {
                console.log("Listener Error:", err);
            }
        };

        // Register listener with 2 minutes timeout
        sachiya.ev.on("messages.upsert", messageListener);
        setTimeout(() => {
            sachiya.ev.off("messages.upsert", messageListener);
        }, 120000);

    } catch (error) {
        console.log('[VIDEO PLUGIN ERROR]:', error?.message || error);

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
