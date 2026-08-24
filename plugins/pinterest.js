const { cmd } = require("../command");
const axios = require("axios");
const cheerio = require("cheerio");

cmd(
  {
    pattern: "pinterest",
    alias: ["pin", "pindl"],
    react: "📌",
    desc: "Download videos, images, or GIFs from Pinterest without APIs.",
    category: "download",
    use: ".pinterest <Pinterest URL>",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    try {
      // 1. URL Validation
      if (!q || !q.startsWith("http")) {
        return reply(
          `╭━━━〔 *✨ SACHIYA-MD PINTEREST ✨* 〕━━━\n` +
          `┃\n` +
          `┃ ❌ *Invalid Input!*\n` +
          `┃ කරුණාකර නිවැරදි Pinterest Link එකක් ලබා දෙන්න.\n` +
          `┃\n` +
          `┃ 📌 *Example:*\n` +
          `┃ \`.pin https://pin.it/1a2b3c4\`\n` +
          `┃\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        );
      }

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });
      reply("*⏳ Scraping media from Pinterest... Please wait!* 🔄");

      // 2. Fetching HTML
      const { data: html } = await axios.get(q, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        },
      });

      const $ = cheerio.load(html);
      let mediaUrl = "";
      let mediaType = "image"; // image, video, gif

      // 3. Check for Video / MP4
      mediaUrl = $('meta[property="og:video:secure_url"]').attr("content") ||
                 $('meta[name="og:video"]').attr("content") ||
                 $("video").attr("src");

      if (!mediaUrl) {
        const scriptData = $("#__PWS_DATA__").html();
        if (scriptData) {
          const videoMatch = scriptData.match(/"url":"(https:\/\/[^"]+\.mp4)"/);
          if (videoMatch) mediaUrl = videoMatch[1];
        }
      }

      if (mediaUrl) {
        mediaType = "video";
      } else {
        // 4. Check for Image or GIF
        mediaUrl = $('meta[property="og:image"]').attr("content") ||
                   $('meta[name="og:image"]').attr("content");

        // URL එකේ .gif තියෙනවද බලලා GIF එකක් ලෙස හඳුනා ගැනීම
        if (mediaUrl && mediaUrl.toLowerCase().includes(".gif")) {
          mediaType = "gif";
        }
      }

      if (!mediaUrl) {
        return reply("*❌ Failed to extract media! The link might be private or invalid.* ⚠️");
      }

      // 5. Title
      let title = $('meta[property="og:title"]').attr("content") || 
                  $("title").text().replace(" | Pinterest", "") || 
                  "Pinterest Media";

      const caption = `╭━━━〔 *✨ SACHIYA-MD PINTEREST ✨* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📝 *Title:* ${title}\n` +
                      `┃ 🗂️ *Type:* ${mediaType.toUpperCase()}\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                      `> *⚡ Powered by SACHIYA-MD 💫*`;

      // 6. Send Media according to the correct type
      if (mediaType === "video") {
        await sachiya.sendMessage(
          from,
          { video: { url: mediaUrl }, caption: caption },
          { quoted: mek }
        );
      } else if (mediaType === "gif") {
        // WhatsApp වල GIF එකක් විදිහට (Loop වෙන විදිහට) යැවීම සඳහා video option එකේ gifPlayback: true පාවිච්චි කරයි
        await sachiya.sendMessage(
          from,
          { video: { url: mediaUrl }, caption: caption, gifPlayback: true },
          { quoted: mek }
        );
      } else {
        await sachiya.sendMessage(
          from,
          { image: { url: mediaUrl }, caption: caption },
          { quoted: mek }
        );
      }

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.error("❌ SACHIYA-MD Pinterest Error:", e);
      reply("*❌ An error occurred! Please make sure the link is correct.* ⚠️");
    }
  }
);
