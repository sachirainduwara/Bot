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

// 🚀 Advanced Multi-Quality API (Cobalt & Fallbacks)
async function getDynamicVideoUrl(youtubeUrl, quality = '720') {
    // 1. Try Cobalt API which supports exact quality mapping
    try {
        const cobaltRes = await tryRequest(() => axios.post('https://co.wuk.sh/api/json', {
            url: youtubeUrl,
            videoQuality: quality,
            filenamePattern: 'classic'
        }, {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            timeout: 15000
        }));

        if (cobaltRes?.data?.status === 'redirect' || cobaltRes?.data?.status === 'stream') {
            return {
                download: cobaltRes.data.url,
                title: 'YouTube_Video'
            };
        }
    } catch (e) {
        // Fallback to other APIs if Cobalt fails
    }

    // 2. EliteProTech API with quality parameter
    try {
        const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp4&quality=${quality}`;
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
        if (res?.data?.success && res?.data?.downloadURL) {
            return {
                download: res.data.downloadURL,
                title: res.data.title
            };
        }
    } catch (e) {}

    // 3. Yupra API Fallback
    try {
        const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}&quality=${quality}`;
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
        if (res?.data?.success && res?.data?.data?.download_url) {
            return {
                download: res.data.data.download_url,
                title: res.data.data.title
            };
        }
    } catch (e) {}

    // 4. Okatsu API Final Fallback
    try {
        const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
        const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
        if (res?.data?.result?.mp4) {
            return { 
                download: res.data.result.mp4, 
                title: res.data.result.title 
            };
        }
    } catch (e) {}

    throw new Error('All download sources failed to fetch quality link.');
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

        // Smart URL or Search Query Handler
        if (q.startsWith('http://') || q.startsWith('https://')) {
            videoUrl = q;
            // Fetch video metadata properly using yts for URLs too
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

        // ⏱️ Check if video duration is less than 6 hours (6 * 3600 = 21600 seconds)
        if (videoSeconds > 21600) {
            await sachiya.sendMessage(from, { react: { text: "⚠️", key: mek.key } }).catch(() => {});
            return reply(`❌ *Video is too long!* \n\n⏱ *Duration:* ${videoDuration}\n⚠️ *Please select a video shorter than 6 hours (Max 6 hours allowed).*`);
        }

        const ytId = (videoUrl.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
        const thumb = videoThumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/sddefault.jpg` : '');

        // Detail Card Message with Quality Options
        const descMsg = `╭━━━〔 *SACHIYA-MD VIDEO* 〕━━━\n` +
                        `┃\n` +
                        `┃ 📝 *Title:* ${videoTitle || q}\n` +
                        `┃ ⏱️ *Duration:* ${videoDuration || 'N/A'}\n` +
                        `┃ 👤 *Channel:* ${videoAuthor || 'N/A'}\n` +
                        `┃ 👁️ *Views:* ${videoViews ? videoViews.toLocaleString() : 'N/A'}\n` +
                        `┃ 🔗 *Url:* ${videoUrl}\n` +
                        `┃\n` +
                        `┣━━━〔 *SELECT QUALITY* 〕━━━\n` +
                        `┃\n` +
                        `┃ 1️⃣ *1080p (HD)*\n` +
                        `┃ 2️⃣ *720p (Normal)*\n` +
                        `┃ 3️⃣ *360p (Low Data)*\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> 💬 *Please reply with the number (1, 2, or 3) to download your video!*\n` +
                        `> *⚡ Powered by SACHIYA-MD 💫*`;

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

        // 🎛️ Listen for user's quality choice response
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
                    
                    let selectedQuality = "720";
                    let qualityName = "720p";

                    if (choiceText === "1") {
                        selectedQuality = "1080";
                        qualityName = "1080p";
                    } else if (choiceText === "2") {
                        selectedQuality = "720";
                        qualityName = "720p";
                    } else if (choiceText === "3") {
                        selectedQuality = "360";
                        qualityName = "360p";
                    } else {
                        return; // Ignore if other text
                    }

                    // Remove listener once chosen
                    sachiya.ev.off("messages.upsert", messageListener);

                    await sachiya.sendMessage(from, { react: { text: "📥", key: msg.key } }).catch(() => {});

                    let videoData;
                    try {
                        videoData = await getDynamicVideoUrl(videoUrl, selectedQuality);
                    } catch (apiErr) {
                        console.log(`[VIDEO API] Failed:`, apiErr.message || apiErr);
                    }

                    if (!videoData || !videoData.download) {
                        await sachiya.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => {});
                        return sachiya.sendMessage(from, { text: `❌ *Failed to fetch ${qualityName} download link! Please try again later.*` }, { quoted: msg });
                    }

                    const downloadUrl = videoData.download;
                    const finalTitle = videoData.title !== 'YouTube_Video' ? videoData.title : (videoTitle || 'YouTube_Video');
                    const cleanFileName = `${finalTitle.replace(/[^\w\s-]/gi, '')}_${qualityName}.mp4`;

                    const captionText = `╭━━━〔 *SACHIYA-MD DOWNLOADED* 〕━━━\n` +
                                        `┃\n` +
                                        `┃ 🎬 *Title:* ${finalTitle}\n` +
                                        `┃ 📥 *Status:* ${qualityName} download success! ✅\n` +
                                        `┃\n` +
                                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                        `> *⚡ Powered by SACHIYA-MD 💫*`;

                    // Send video directly
                    await sachiya.sendMessage(from, {
                        video: { url: downloadUrl },
                        mimetype: 'video/mp4',
                        fileName: cleanFileName,
                        caption: captionText
                    }, { quoted: msg });

                    // Success Reaction
                    await sachiya.sendMessage(from, { react: { text: "🎉", key: msg.key } }).catch(() => {});
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
