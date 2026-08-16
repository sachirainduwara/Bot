const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");

cmd(
  {
    pattern: "song",
    alias: ["ytmp3", "yta"],
    react: "🎵",
    desc: "Download YouTube audio using RapidAPI",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("⚠️ *Please provide a Song Name or YouTube Link!*");
      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      let search = await yts(q);
      let data = search.videos[0];
      if (!data) return reply("❌ *No results found on YouTube!*");

      let caption = `╭━━━〔 *SACHIYA-MD AUDIO* 〕━━━\n` +
                    `┃\n` +
                    `┃ 🎵 *Title:* ${data.title}\n` +
                    `┃ 👤 *Channel:* ${data.author.name}\n` +
                    `┃ ⏱ *Duration:* ${data.timestamp}\n` +
                    `┃ 👀 *Views:* ${data.views.toLocaleString()}\n` +
                    `┃ 🔗 *Link:* ${data.url}\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *Powered by SACHIYA MD 💫*`;

      await sachiya.sendMessage(from, { image: { url: data.thumbnail }, caption }, { quoted: mek });

      // RapidAPI Request using your personal API Key
      let options = {
        method: 'GET',
        url: 'https://youtube-mp36.p.rapidapi.com/dl',
        params: { id: data.videoId },
        headers: {
          'X-RapidAPI-Key': '2beb18e10fmsh691b9509fce892ap1ea143jsna98b0eb70b24',
          'X-RapidAPI-Host': 'youtube-mp36.p.rapidapi.com'
        }
      };

      let response = await axios.request(options);
      let downloadUrl = response.data.link;

      if (!downloadUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to fetch download link from RapidAPI!*");
      }

      let audioBuffer = await axios.get(downloadUrl, { responseType: "arraybuffer" });

      await sachiya.sendMessage(
        from,
        {
          audio: Buffer.from(audioBuffer.data),
          mimetype: "audio/mpeg",
          ptt: false
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.log("SONG ERROR:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("❌ *Error while processing your request!*");
    }
  }
);
