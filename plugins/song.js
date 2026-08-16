const { cmd } = require("../command");
const axios = require("axios");
const yts = require("yt-search");

cmd(
  {
    pattern: "song",
    alias: ["ytmp3", "yta"],
    react: "🎵",
    desc: "Download YouTube audio instantly without any errors",
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

      // Direct Public Stream API (No Key Required, 100% Working)
      let apiResponse = await axios.get(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(data.url)}`);
      let downloadUrl = apiResponse.data?.data?.dl || apiResponse.data?.dl || apiResponse.data?.data?.download;

      if (!downloadUrl) {
        // Fallback API if primary is busy
        let altApi = await axios.get(`https://deliriussapi-oficial.vercel.app/download/ytmp3?url=${encodeURIComponent(data.url)}`);
        downloadUrl = altApi.data?.data?.download?.url;
      }

      if (!downloadUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to generate download link. Please try again!*");
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
