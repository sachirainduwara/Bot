const { cmd } = require('../command');
const axios = require('axios');
const yts = require('yt-search');
const fs = require('fs');
const path = require('path');
const { toAudio } = require('../lib/converter');

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
    alias: ["ytsong", "ytmp3", "play"],
    desc: "Download YouTube Songs",
    category: "download",
    react: "🎵",
    filename: __filename
}, async (sachiya, mek, m, { from, quoted, body, isCmd, command, args, q, reply }) => {
    try {
        if (!q) {
            return reply("❌ *Please provide a song name or YouTube link!*\n\n*Example:* `.song Manike Mage Hithe` or `.song https://youtu.be/...`");
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
                return reply("❌ No songs found matching your query!");
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
        const descMsg = `╭━━━〔 *SACHIYA-MD SONG* 〕━━━\n` +
                        `┃\n` +
                        `┃ 🎵 *Title:* ${videoTitle || q}\n` +
                        `┃ ⏱️ *Duration:* ${videoDuration || 'N/A'}\n` +
                        `┃ 👤 *Channel:* ${videoAuthor || 'N/A'}\n` +
                        `┃ 👁️ *Views:* ${videoViews ? videoViews.toLocaleString() : 'N/A'}\n` +
                        `┃ 🔗 *Url:* ${videoUrl}\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> ⏳ *Downloading audio, please wait...* 🎶`;

        if (thumb) {
            await sachiya.sendMessage(from, {
                image: { url: thumb },
                caption: descMsg
            }, { quoted: mek });
        } else {
            await reply(descMsg);
        }

        // Try multiple APIs with fallback chain: EliteProTech -> Yupra -> Okatsu
        let audioData;
        let audioBuffer;
        let downloadSuccess = false;

        const apiMethods = [
            { name: 'EliteProTech', method: () => getEliteProTechDownloadByUrl(videoUrl) },
            { name: 'Yupra', method: () => getYupraDownloadByUrl(videoUrl) },
            { name: 'Okatsu', method: () => getOkatsuDownloadByUrl(videoUrl) }
        ];

        for (const apiMethod of apiMethods) {
            try {
                audioData = await apiMethod.method();
                const audioUrl = audioData.download || audioData.dl || audioData.url;

                if (!audioUrl) {
                    console.log(`[SONG API] ${apiMethod.name} returned no download URL, trying next API...`);
                    continue;
                }

                // Try arraybuffer mode
                try {
                    const audioResponse = await axios.get(audioUrl, {
                        responseType: 'arraybuffer',
                        timeout: 90000,
                        maxContentLength: Infinity,
                        maxBodyLength: Infinity,
                        decompress: true,
                        validateStatus: s => s >= 200 && s < 400,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': '*/*',
                            'Accept-Encoding': 'identity'
                        }
                    });
                    audioBuffer = Buffer.from(audioResponse.data);

                    if (audioBuffer && audioBuffer.length > 0) {
                        downloadSuccess = true;
                        break;
                    }
                } catch (downloadErr) {
                    const statusCode = downloadErr.response?.status || downloadErr.status;
                    if (statusCode === 451) {
                        console.log(`[SONG API] Download blocked (451) from ${apiMethod.name}, trying next API...`);
                        continue;
                    }

                    // Try stream mode as fallback
                    try {
                        const audioResponse = await axios.get(audioUrl, {
                            responseType: 'stream',
                            timeout: 90000,
                            maxContentLength: Infinity,
                            maxBodyLength: Infinity,
                            validateStatus: s => s >= 200 && s < 400,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Accept': '*/*',
                                'Accept-Encoding': 'identity'
                            }
                        });
                        const chunks = [];
                        await new Promise((resolve, reject) => {
                            audioResponse.data.on('data', c => chunks.push(c));
                            audioResponse.data.on('end', resolve);
                            audioResponse.data.on('error', reject);
                        });
                        audioBuffer = Buffer.concat(chunks);

                        if (audioBuffer && audioBuffer.length > 0) {
                            downloadSuccess = true;
                            break;
                        }
                    } catch (streamErr) {
                        continue;
                    }
                }
            } catch (apiErr) {
                console.log(`[SONG API] ${apiMethod.name} failed:`, apiErr.message || apiErr);
                continue;
            }
        }

        if (!downloadSuccess || !audioBuffer || audioBuffer.length === 0) {
            throw new Error('All download sources failed. The content may be unavailable or blocked in your region.');
        }

        // Detect file format signature
        const firstBytes = audioBuffer.slice(0, 12);
        const hexSignature = firstBytes.toString('hex');
        const asciiSignature = firstBytes.toString('ascii', 4, 8);

        let fileExtension = 'mp3';
        let detectedFormat = 'unknown';

        if (asciiSignature === 'ftyp' || hexSignature.startsWith('000000')) {
            const ftypBox = audioBuffer.slice(4, 8).toString('ascii');
            if (ftypBox === 'ftyp') {
                detectedFormat = 'M4A/MP4';
                fileExtension = 'm4a';
            }
        } else if (audioBuffer.toString('ascii', 0, 3) === 'ID3' || 
                   (audioBuffer[0] === 0xFF && (audioBuffer[1] & 0xE0) === 0xE0)) {
            detectedFormat = 'MP3';
            fileExtension = 'mp3';
        } else if (audioBuffer.toString('ascii', 0, 4) === 'OggS') {
            detectedFormat = 'OGG/Opus';
            fileExtension = 'ogg';
        } else if (audioBuffer.toString('ascii', 0, 4) === 'RIFF') {
            detectedFormat = 'WAV';
            fileExtension = 'wav';
        } else {
            fileExtension = 'm4a';
        }

        // Convert to MP3 if needed
        let finalBuffer = audioBuffer;
        if (fileExtension !== 'mp3') {
            try {
                finalBuffer = await toAudio(audioBuffer, fileExtension);
                if (!finalBuffer || finalBuffer.length === 0) {
                    throw new Error('Conversion returned empty buffer');
                }
            } catch (convErr) {
                throw new Error(`Failed to convert ${detectedFormat} to MP3: ${convErr.message}`);
            }
        }

        const finalTitle = audioData.title || videoTitle || 'YouTube_Song';
        const cleanFileName = `${finalTitle.replace(/[^\w\s-]/gi, '')}.mp3`;

        // Send Audio File
        await sachiya.sendMessage(from, {
            audio: finalBuffer,
            mimetype: 'audio/mpeg',
            fileName: cleanFileName,
            ptt: false
        }, { quoted: mek });

        // Cleanup temp files
        try {
            const tempDir = path.join(__dirname, '../temp');
            if (fs.existsSync(tempDir)) {
                const files = fs.readdirSync(tempDir);
                const now = Date.now();
                files.forEach(file => {
                    const filePath = path.join(tempDir, file);
                    try {
                        const stats = fs.statSync(filePath);
                        if (now - stats.mtimeMs > 10000) {
                            if (file.endsWith('.mp3') || file.endsWith('.m4a') || /^\d+\.(mp3|m4a)$/.test(file)) {
                                fs.unlinkSync(filePath);
                            }
                        }
                    } catch (e) {}
                });
            }
        } catch (e) {}

        // Success Reaction
        await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    } catch (error) {
        console.error('[SONG PLUGIN ERROR]:', error?.message || error);

        let errorMessage = '❌ Failed to download song.';
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
