const { cmd } = require("../command");
const { ytmp3 } = require("sadaslk-dlcore");
const yts = require("yt-search");

cmd(
  {
    pattern: "song",
    alias: ["ytmp3", "yta"],
    react: "🎵",
    desc: "Download YouTube audio without external APIs",
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

      let downloadData = await ytmp3(data.url);
      if (!downloadData || !downloadData.url) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Download failed from core server!*");
      }

      await sachiya.sendMessage(from, { audio: { url: downloadData.url }, mimetype: "audio/mpeg", ptt: false }, { quoted: mek });
      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.log("SONG ERROR:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("❌ *Error while processing your request!*");
    }
  }
);
