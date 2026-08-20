const { cmd } = require("../command");
const { ttdl } = require("ruhend-scraper");
const axios = require('axios');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

cmd(
  {
    pattern: "tiktok",
    alias: ["tt", "ttdl"],
    react: "📱",
    desc: "Download TikTok video",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    try {
      // Check if message has already been processed
      if (processedMessages.has(mek.key.id)) {
        return;
      }
      
      // Add message ID to processed set
      processedMessages.add(mek.key.id);
      
      // Clean up old message IDs after 5 minutes
      setTimeout(() => {
        processedMessages.delete(mek.key.id);
      }, 5 * 60 * 1000);

      if (!q) {
        return await reply("⚠️ *Please provide a valid TikTok link!*\n\n*Example:* `.tiktok https://vt.tiktok.com/...`");
      }

      const url = q.trim();

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
        return await reply("❌ *That is not a valid TikTok link. Please provide a valid TikTok video link.*");
      }

      await sachiya.sendMessage(from, {
        react: { text: '⏳', key: mek.key }
      });

      let videoUrl = null;
      let title = null;

      // 1. Try Siputzx API first
      try {
        const apiUrl = `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`;
        const response = await axios.get(apiUrl, { 
            timeout: 15000,
            headers: {
                'accept': '*/*',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data && response.data.status && response.data.data) {
            const resData = response.data.data;
            if (resData.urls && Array.isArray(resData.urls) && resData.urls.length > 0) {
                videoUrl = resData.urls[0];
                title = resData.metadata?.title || "TikTok Video";
            } else if (resData.video_url) {
                videoUrl = resData.video_url;
                title = resData.metadata?.title || "TikTok Video";
            } else if (resData.url) {
                videoUrl = resData.url;
                title = resData.metadata?.title || "TikTok Video";
            } else if (resData.download_url) {
                videoUrl = resData.download_url;
                title = resData.metadata?.title || "TikTok Video";
            }
        }
      } catch (apiError) {
        console.log(`Siputzx API failed, trying fallback: ${apiError.message}`);
      }

      // 2. Fallback to ruhend-scraper (ttdl) if Siputzx fails
      if (!videoUrl) {
        try {
            let downloadData = await ttdl(url);
            if (downloadData && downloadData.data && downloadData.data.length > 0) {
                const mediaData = downloadData.data;
                for (let i = 0; i < Math.min(20, mediaData.length); i++) {
                    const media = mediaData[i];
                    const mediaUrl = media.url;
                    const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl) || media.type === 'video';

                    if (isVideo) {
                        const caption = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━\n` +
                                      `┃\n` +
                                      `┃ 🚀 *Powered by SACHIYA MD*\n` +
                                      `┃\n` +
                                      `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                                      `> 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗗 𝗕𝗬 𝗦𝗔𝗖𝗛𝗜𝗬𝗔-𝗠𝗗 💫`;

                        await sachiya.sendMessage(from, {
                            video: { url: mediaUrl },
                            mimetype: "video/mp4",
                            caption: caption
                        }, { quoted: mek });

                        await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });
                        return;
                    }
                }
            }
        } catch (ttdlError) {
            console.log("ttdl fallback also failed:", ttdlError.message);
        }
      }

      // 3. Send video via Buffer or URL method if videoUrl is found
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
            
            const cleanTitle = title ? title.replace(/[^\w\s-]/gi, '') : "TikTok Video";
            const caption = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━\n` +
                            `┃\n` +
                            `┃ 🎵 *Title:* ${cleanTitle}\n` +
                            `┃ 🚀 *Powered by SACHIYA MD*\n` +
                            `┃\n` +
                            `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                            `> 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗗 𝗕𝗬 𝗦𝗔𝗖𝗛𝗜𝗬𝗔-𝗠𝗗 💫`;
            
            await sachiya.sendMessage(from, {
                video: videoBuffer,
                mimetype: "video/mp4",
                fileName: `${cleanTitle}.mp4`,
                caption: caption
            }, { quoted: mek });

            await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });
            return;

        } catch (downloadError) {
            console.log(`Buffer download failed, trying direct URL: ${downloadError.message}`);
            try {
                const cleanTitle = title ? title.replace(/[^\w\s-]/gi, '') : "TikTok Video";
                const caption = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━\n` +
                                `┃\n` +
                                `┃ 🎵 *Title:* ${cleanTitle}\n` +
                                `┃ 🚀 *Powered by SACHIYA MD*\n` +
                                `┃\n` +
                                `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                                `> 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗘𝗗 𝗕𝗬 𝗦𝗔𝗖𝗛𝗜𝗬𝗔-𝗠𝗗 💫`;
                
                await sachiya.sendMessage(from, {
                    video: { url: videoUrl },
                    mimetype: "video/mp4",
                    fileName: `${cleanTitle}.mp4`,
                    caption: caption
                }, { quoted: mek });

                await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });
                return;
            } catch (urlError) {
                console.log(`Direct URL method also failed: ${urlError.message}`);
            }
        }
      }

      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      return await reply("❌ *Failed to download TikTok video. All download methods failed. Please try again later.*");

    } catch (e) {
      console.log("TIKTOK COMMAND ERROR:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("❌ *An error occurred while processing the request. Please try again later.*");
    }
  }
);
