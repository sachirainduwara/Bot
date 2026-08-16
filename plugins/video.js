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
            if (attempt < attempts) await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
    throw lastError;
}

async function getEliteProTechVideoByUrl(youtubeUrl) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp4`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.downloadURL) {
        return { download: res.data.downloadURL, title: res.data.title };
    }
    throw new Error('EliteProTech failed');
}

async function getYupraVideoByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.data?.download_url) {
        return { download: res.data.data.download_url, title: res.data.data.title, thumbnail: res.data.data.thumbnail };
    }
    throw new Error('Yupra failed');
}

async function getOkatsuVideoByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp4?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.result?.mp4) {
        return { download: res.data.result.mp4, title: res.data.result.title };
    }
    throw new Error('Okatsu failed');
}

async function videoCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const searchQuery = text.split(' ').slice(1).join(' ').trim() || (text.includes('http') ? text : '');
        
        if (!searchQuery) {
            await sock.sendMessage(chatId, { text: '⚠️ *Usage: .video <video name or YouTube link>*' }, { quoted: message });
            return;
        }

        let videoUrl = '', videoTitle = '', videoThumbnail = '';
        if (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')) {
            videoUrl = searchQuery;
            videoTitle = 'YouTube Video';
            videoThumbnail = 'https://i.ytimg.com/vi/default.jpg';
        } else {
            const { videos } = await yts(searchQuery);
            if (!videos || videos.length === 0) {
                await sock.sendMessage(chatId, { text: '❌ *No videos found!*' }, { quoted: message });
                return;
            }
            videoUrl = videos[0].url;
            videoTitle = videos[0].title;
            videoThumbnail = videos[0].thumbnail;
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        const caption = `╭━━━〔 *SACHIYA MD - VIDEO* 〕━━━\n` +
                        `┃\n` +
                        `┃ 🎬 *Title:* ${videoTitle}\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> Downloading... Please wait 💫`;

        if (videoThumbnail) {
            await sock.sendMessage(chatId, { image: { url: videoThumbnail }, caption }, { quoted: message });
        }

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
                if (videoData?.download) {
                    downloadSuccess = true;
                    break;
                }
            } catch (e) {
                continue;
            }
        }
        
        if (!downloadSuccess || !videoData) {
            throw new Error('All download sources failed.');
        }

        const finalVideoCaption = `╭━━━〔 *SACHIYA MD - VIDEO* 〕━━━\n` +
                                  `┃\n` +
                                  `┃ 🎬 *Title:* ${videoData.title || videoTitle}\n` +
                                  `┃\n` +
                                  `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                                  `> Powered by SACHIYA MD 💫`;

        await sock.sendMessage(chatId, {
            video: { url: videoData.download },
            mimetype: 'video/mp4',
            fileName: `${(videoData.title || videoTitle || 'video').replace(/[^\w\s-]/g, '')}.mp4`,
            caption: finalVideoCaption
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (error) {
        console.error('Video error:', error);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { text: '❌ Failed to download video. Please try again.' }, { quoted: message });
    }
}

videoCommand.command = ['video', '.video', 'mp4'];
videoCommand.category = 'download';
videoCommand.desc = 'Download video from YouTube';

module.exports = videoCommand;
