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

async function getEliteProTechDownloadByUrl(youtubeUrl) {
	const apiUrl = `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`;
	const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
	if (res?.data?.success && res?.data?.downloadURL) {
		return { download: res.data.downloadURL, title: res.data.title };
	}
	throw new Error('EliteProTech ytdown returned no download');
}

async function getYupraDownloadByUrl(youtubeUrl) {
	const apiUrl = `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
	const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
	if (res?.data?.success && res?.data?.data?.download_url) {
		return { download: res.data.data.download_url, title: res.data.data.title, thumbnail: res.data.data.thumbnail };
	}
	throw new Error('Yupra returned no download');
}

async function getOkatsuDownloadByUrl(youtubeUrl) {
	const apiUrl = `https://okatsu-rolezapiiz.vercel.app/downloader/ytmp3?url=${encodeURIComponent(youtubeUrl)}`;
	const res = await tryRequest(() => axios.get(apiUrl, AXIOS_DEFAULTS));
	if (res?.data?.dl) {
		return { download: res.data.dl, title: res.data.title, thumbnail: res.data.thumb };
	}
	throw new Error('Okatsu ytmp3 returned no download');
}

async function songCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const query = text.split(' ').slice(1).join(' ').trim() || (text.includes('http') ? text : '');
        
        if (!query) {
            await sock.sendMessage(chatId, { text: '⚠️ *Usage: .song <song name or YouTube link>*' }, { quoted: message });
            return;
        }

        let video;
        if (query.startsWith('http://') || query.startsWith('https://')) {
			video = { url: query, title: 'YouTube Audio', timestamp: 'Unknown', thumbnail: 'https://i.ytimg.com/vi/default.jpg' };
        } else {
			const search = await yts(query);
			if (!search || !search.videos.length) {
                await sock.sendMessage(chatId, { text: '❌ *No results found.*' }, { quoted: message });
                return;
            }
			video = search.videos[0];
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        const caption = `╭━━━〔 *SACHIYA MD - AUDIO* 〕━━━\n` +
                        `┃\n` +
                        `┃ 🎵 *Title:* ${video.title}\n` +
                        `┃ ⏱ *Duration:* ${video.timestamp || 'N/A'}\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> Downloading... Please wait 💫`;

        if (video.thumbnail) {
            await sock.sendMessage(chatId, { image: { url: video.thumbnail }, caption }, { quoted: message });
        }

		let audioData, audioBuffer;
		let downloadSuccess = false;
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
				
				const audioResponse = await axios.get(audioUrl, {
					responseType: 'arraybuffer',
					timeout: 90000,
					headers: { 'User-Agent': 'Mozilla/5.0' }
				});
				audioBuffer = Buffer.from(audioResponse.data);
				if (audioBuffer && audioBuffer.length > 0) {
					downloadSuccess = true;
					break;
				}
			} catch (err) {
				continue;
			}
		}
		
		if (!downloadSuccess || !audioBuffer) {
			throw new Error('All download sources failed.');
		}

		let finalBuffer = audioBuffer;
		try {
			finalBuffer = await toAudio(audioBuffer, 'mp4');
		} catch (e) {}

		await sock.sendMessage(chatId, {
			audio: finalBuffer,
			mimetype: 'audio/mpeg',
			fileName: `${(audioData?.title || video.title || 'song').replace(/[^\w\s-]/g, '')}.mp3`,
			ptt: false
		}, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (err) {
        console.error('Song error:', err);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { text: '❌ Failed to download song. Please try again later.' }, { quoted: message });
    }
}

songCommand.command = ['song', '.song', 'play'];
songCommand.category = 'download';
songCommand.desc = 'Download audio from YouTube';

module.exports = songCommand;
