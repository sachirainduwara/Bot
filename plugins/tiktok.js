const axios = require('axios');
const { tikdl } = require('ruhend-scraper');

async function tiktokCommand(sock, chatId, message) {
    try {
        const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
        const url = text.split(' ').slice(1).join(' ').trim() || (text.includes('tiktok.com') ? text : '');

        if (!url || !url.includes('tiktok.com')) {
            await sock.sendMessage(chatId, { text: '⚠️ *Usage: .tiktok <TikTok URL>*' }, { quoted: message });
            return;
        }

        await sock.sendMessage(chatId, { react: { text: '⏳', key: message.key } });

        let videoUrl = '';
        try {
            const res = await tikdl(url);
            videoUrl = res.video?.no_watermark || res.video?.no_watermark_hd || res.video?.watermark;
        } catch (e) {
            // Fallback public API if ruhend-scraper fails
            const fallback = await axios.get(`https://api.yupra.my.id/api/downloader/tiktok?url=${encodeURIComponent(url)}`).catch(() => null);
            videoUrl = fallback?.data?.data?.play || fallback?.data?.data?.hdplay;
        }

        if (!videoUrl) {
            throw new Error('Could not fetch TikTok video.');
        }

        const caption = `╭━━━〔 *SACHIYA MD - TIKTOK* 〕━━━\n` +
                        `┃\n` +
                        `┃ 📥 *Successfully Downloaded!*\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> Powered by SACHIYA MD 💫`;

        await sock.sendMessage(chatId, {
            video: { url: videoUrl },
            mimetype: 'video/mp4',
            caption: caption
        }, { quoted: message });

        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
    } catch (error) {
        console.error('TikTok error:', error);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { text: '❌ Failed to download TikTok video. Check the link and try again.' }, { quoted: message });
    }
}

tiktokCommand.command = ['tiktok', '.tiktok', 'tt'];
tiktokCommand.category = 'download';
tiktokCommand.desc = 'Download TikTok videos without watermark';

module.exports = tiktokCommand;
