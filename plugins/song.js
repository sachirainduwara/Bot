const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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

// Built-in audio converter using ffmpeg to avoid external missing module errors
function toAudio(buffer, ext) {
    return new Promise((resolve, reject) => {
        const tmpDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        const inputPath = path.join(tmpDir, `${Date.now()}.${ext}`);
        const outputPath = path.join(tmpDir, `${Date.now()}.mp3`);
        
        fs.writeFileSync(inputPath, buffer);
        
        exec(`ffmpeg -i "${inputPath}" -vn -ab 128k -ar 44100 -f mp3 "${outputPath}"`, async (err) => {
            try { if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); } catch (e) {}
            if (err) {
                try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (e) {}
                return reject(err);
            }
            try {
                const convertedBuffer = fs.readFileSync(outputPath);
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                resolve(convertedBuffer);
            } catch (readErr) {
                reject(readErr);
            }
        });
    });
}

// APIs
async function getEliteProTechDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.downloadURL) {
        return { download: res.data.downloadURL, title: res.data.title };
    }
    throw new Error('EliteProTech failed');
}

async function getYupraDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.success && res?.data?.data?.download_url) {
        return { download: res.data.data.download_url, title: res.data.data.title, thumbnail: res.data.data.thumbnail };
    }
    throw new Error('Yupra failed');
}

async function getOkatsuDownloadByUrl(youtubeUrl) {
    const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
    const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
    if (res?.data?.dl) {
        return { download: res.data.dl, title: res.data.title, thumbnail: res.data.thumb };
    }
    throw new Error('Okatsu failed');
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
        if (!q) return reply("❌ *Please provide a song name or YouTube link!*\n\n*Example:* `.song Manike Mage Hithe`");

        let video;
        if (q.startsWith('http://') || q.startsWith('https://')) {
            const ytId = (q.match(/(?:youtu\.be\/|v=)([a-zA-Z0-9_-]{11})/) || [])[1];
            if (!ytId) return reply("❌ Invalid YouTube link!");
            const search = await yts({ videoId: ytId });
            video = search;
        } else {
            const search = await yts(q);
            if (!search.videos.length) return reply("❌ No results found matching your query!");
            video = search.videos[0];
        }

        const descMsg = `╭━━━〔 *SACHIYA-MD SONG* 〕━━━\n` +
                        `┃\n` +
                        `┃ 🎵 *Title:* ${video.title}\n` +
                        `┃ ⏱️ *Duration:* ${video.timestamp}\n` +
                        `┃ 📥 *Status:* Downloading audio... ⏳\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> *⚡ Powered by SACHIYA-MD 💫*`;
        
        await sachiya.sendMessage(from, { image: { url: video.thumbnail }, caption: descMsg }, { quoted: mek });

        let audioData, audioBuffer, downloadSuccess = false;
        const apiMethods = [
            { name: 'EliteProTech', method: () => getEliteProTechDownloadByUrl(video.url) },
            { name: 'Yupra', method: () => getYupraDownloadByUrl(video.url) },
            { name: 'Okatsu', method: () => getOkatsuDownloadByUrl(video.url) }
        ];

        for (const apiMethod of apiMethods) {
            try {
                audioData = await apiMethod.method();
                const audioUrl = audioData.download || audioData.dl || audioData.url;
                if (!audioUrl) continue;
                const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 90000 });
                audioBuffer = Buffer.from(audioResponse.data);
                if (audioBuffer.length > 0) { 
                    downloadSuccess = true; 
                    break; 
                }
            } catch (e) { 
                continue; 
            }
        }

        if (!downloadSuccess || !audioBuffer) {
            throw new Error("All download sources failed.");
        }

        // Convert buffer to standard MP3
        let finalBuffer;
        try {
            finalBuffer = await toAudio(audioBuffer, 'mp4');
        } catch (convErr) {
            finalBuffer = audioBuffer; // fallback to raw buffer if conversion fails
        }

        const cleanFileName = `${(video.title || 'song').replace(/[^\w\s-]/gi, '')}.mp3`;

        const captionText = `╭━━━〔 *SACHIYA-MD AUDIO* 〕━━━\n` +
                            `┃\n` +
                            `┃ 🎵 *Title:* ${video.title}\n` +
                            `┃ 📥 *Status:* Downloaded Successfully! ✅\n` +
                            `┃\n` +
                            `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                            `> *⚡ Powered by SACHIYA-MD 💫*`;

        // Send Audio
        await sachiya.sendMessage(from, {
            audio: finalBuffer,
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
