const { cmd } = require("../command");
const yts = require("yt-search");
const fg = require("api-dylux"); // Using dylux stable scraper which handles bot blocks

cmd(
  {
    pattern: "song",
    alias: ["ytmp3", "yta"],
    react: "🎵",
    desc: "Download YouTube audio without any errors",
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

      // Using dylux scraper to bypass bot verification restrictions
      let res = await fg.ytmp3(data.url);
      let downloadUrl = res.dl_url;

      if (!downloadUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to fetch download link!*");
      }

      await sachiya.sendMessage(
        from,
        {
          audio: { url: downloadUrl },
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
