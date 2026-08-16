const { ttdl } = require("ruhend-scraper");
const axios = require('axios');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

async function tiktokCommand(sock, chatId, message) {
    try {
        // Check if message has already been processed
        if (processedMessages.has(message.key.id)) {
            return;
        }
        
        // Add message ID to processed set
        processedMessages.add(message.key.id);
        
        // Clean up old message IDs after 5 minutes
        setTimeout(() => {
            processedMessages.delete(message.key.id);
        }, 5 * 60 * 1000);

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "⚠️ *Please provide a TikTok link for the video.*"
            }, { quoted: message });
        }

        // Extract URL from command
        const url = text.split(' ').slice(1).join(' ').trim();
        
        if (!url) {
            return await sock.sendMessage(chatId, { 
                text: "⚠️ *Please provide a TikTok link for the video.*"
            }, { quoted: message });
        }

        // Check for various TikTok URL formats
        const tiktokPatterns = [
            /https?:\/\/(?:www\.)?tiktok\.com\//,
            /https?:\/\/(?:vm\.)?tiktok\.com\//,
            /https?:\/\/(?:vt\.)?tiktok\.com\//,
            /https?:\/\/(?:www\.)?tiktok\.com\/@/,
            /https?:\/\/(?:www\.)?tiktok\.com\/t\//
        ];

        const isValidUrl = tiktokPatterns.some(pattern => pattern.test(url));
        
        if (!isValidUrl) {
            return await sock.sendMessage(chatId, { 
                text: "❌ *That is not a valid TikTok link. Please provide a valid TikTok video link.*"
            }, { quoted: message });
        }

        // ⏳ Processing Reaction
        await sock.sendMessage(chatId, {
            react: { text: '⏳', key: message.key }
        });

        try {
            // Use only Siputzx API
            const apiUrl = `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`;

            let videoUrl = null;
            let audioUrl = null;
            let title = null;

            // Call Siputzx API
            try {
                const response = await axios.get(apiUrl, { 
                    timeout: 15000,
                    headers: {
                        'accept': '*/*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (response.data && response.data.status) {
                    if (response.data.data) {
                        if (response.data.data.urls && Array.isArray(response.data.data.urls) && response.data.data.urls.length > 0) {
                            videoUrl = response.data.data.urls[0];
                            title = response.data.data.metadata?.title || "TikTok Video";
                        } else if (response.data.data.video_url) {
                            videoUrl = response.data.data.video_url;
                            title = response.data.data.metadata?.title || "TikTok Video";
                        } else if (response.data.data.url) {
                            videoUrl = response.data.data.url;
                            title = response.data.data.metadata?.title || "TikTok Video";
                        } else if (response.data.data.download_url) {
                            videoUrl = response.data.data.download_url;
                            title = response.data.data.metadata?.title || "TikTok Video";
                        } else {
                            throw new Error("No video URL found in Siputzx API response");
                        }
                    } else {
                        throw new Error("No data field in Siputzx API response");
                    }
                } else {
                    throw new Error("Invalid Siputzx API response");
                }
            } catch (apiError) {
                console.error(`Siputzx API failed: ${apiError.message}`);
            }

            // If Siputzx API didn't work, try the original ttdl method
            if (!videoUrl) {
                try {
                    let downloadData = await ttdl(url);
                    if (downloadData && downloadData.data && downloadData.data.length > 0) {
                        const mediaData = downloadData.data;
                        for (let i = 0; i < Math.min(20, mediaData.length); i++) {
                            const media = mediaData[i];
                            const mediaUrl = media.url;
                            const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl) || media.type === 'video';

                            const fallbackCaption = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━\n` +
                                                    `┃\n` +
                                                    `┃ 📱 *Status:* Success\n` +
                                                    `┃\n` +
                                                    `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                                                    `> Powered by SACHIYA MD 💫`;

                            if (isVideo) {
                                await sock.sendMessage(chatId, {
                                    video: { url: mediaUrl },
                                    mimetype: "video/mp4",
                                    caption: fallbackCaption
                                }, { quoted: message });
                            } else {
                                await sock.sendMessage(chatId, {
                                    image: { url: mediaUrl },
                                    caption: fallbackCaption
                                }, { quoted: message });
                            }
                        }
                        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
                        return;
                    }
                } catch (ttdlError) {
                    console.error("ttdl fallback also failed:", ttdlError.message);
                }
            }

            // Send the video if we got a URL from the APIs
            if (videoUrl) {
                try {
                    const videoResponse = await axios.get(videoUrl, {
                        responseType: 'arraybuffer',
                        timeout: 60000,
                        maxContentLength: 100 * 1024 * 1024,
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                            'Accept': 'video/mp4,video/*,*/*;q=0.9',
                            'Referer': 'https://www.tiktok.com/'
                        }
                    });
                    
                    const videoBuffer = Buffer.from(videoResponse.data);
                    
                    if (videoBuffer.length === 0) {
                        throw new Error("Video buffer is empty");
                    }
                    
                    // 🎨 SACHIYA-MD STYLIZED CARD CAPTION
                    const caption = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━\n` +
                                    `┃\n` +
                                    `┃ 🎬 *Title:* ${title || "TikTok Video"}\n` +
                                    `┃\n` +
                                    `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                                    `> Powered by SACHIYA MD 💫`;
                    
                    await sock.sendMessage(chatId, {
                        video: videoBuffer,
                        mimetype: "video/mp4",
                        caption: caption
                    }, { quoted: message });

                    // ✅ Success Reaction
                    await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
                    return;

                } catch (downloadError) {
                    console.error(`Failed to download video: ${downloadError.message}`);
                    try {
                        const caption = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━\n` +
                                        `┃\n` +
                                        `┃ 🎬 *Title:* ${title || "TikTok Video"}\n` +
                                        `┃\n` +
                                        `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                                        `> Powered by SACHIYA MD 💫`;
                        
                        await sock.sendMessage(chatId, {
                            video: { url: videoUrl },
                            mimetype: "video/mp4",
                            caption: caption
                        }, { quoted: message });

                        await sock.sendMessage(chatId, { react: { text: '✅', key: message.key } });
                        return;
                    } catch (urlError) {
                        console.error(`URL method also failed: ${urlError.message}`);
                    }
                }
            }

            // ❌ Failure Reaction
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            return await sock.sendMessage(chatId, { 
                text: "❌ *Failed to download TikTok video. All download methods failed. Please try again later.*"
            }, { quoted: message });

        } catch (error) {
            console.error('Error in TikTok download:', error);
            await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
            await sock.sendMessage(chatId, { 
                text: "❌ *Failed to download the TikTok video. Please try again with a different link.*"
            }, { quoted: message });
        }
    } catch (error) {
        console.error('Error in TikTok command:', error);
        await sock.sendMessage(chatId, { react: { text: '❌', key: message.key } });
        await sock.sendMessage(chatId, { 
            text: "❌ *An error occurred while processing the request. Please try again later.*"
        }, { quoted: message });
    }
}

module.exports = tiktokCommand;
