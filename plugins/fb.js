const { cmd } = require("../command");
const getFbVideoInfo = require("@xaviabot/fb-downloader");
const config = require("../config");

cmd(
  {
    pattern: "fb",
    alias: ["facebook", "fbdl"],
    react: "🎬",
    desc: "Download Facebook Video",
    category: "download",
    filename: __filename,
  },
  async (
    sachiya,
    mek,
    m,
    {
      from,
      quoted,
      body,
      isCmd,
      command,
      args,
      q,
      isGroup,
      sender,
      senderNumber,
      pushname,
      reply,
    }
  ) => {
    try {
      if (!q) return reply("⚠️ *Please provide a valid Facebook video URL!*");

      // 🔍 Enhanced Facebook URL Validation Regex
      const fbRegex = /(https?:\/\/)?(www\.|m\.)?(facebook|fb)\.(com|watch|share|reel)\/.+/;
      if (!fbRegex.test(q)) {
        return reply("❌ *Invalid Facebook URL! Please check and try again.*");
      }

      // Fix for User Name
      const userName = pushname || m.pushName || mek.pushName || 'User';

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      const result = await getFbVideoInfo(q).catch(() => null);
      if (!result || (!result.sd && !result.hd)) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download video. Video might be private, deleted, or invalid!*");
      }

      const { title, sd, hd } = result;
      const bestQualityUrl = hd || sd;
      const qualityText = hd ? "HD High Quality" : "SD Standard Quality";

      const captionMsg = `╭━━━〔 *FACEBOOK DOWNLOADER* 〕━━━\n` +
                         `┃\n` +
                         `┃ 🎬 *Title:* ${title || "Facebook Video"}\n` +
                         `┃ 📊 *Quality:* ${qualityText}\n` +
                         `┃ 👤 *User:* ${userName}\n` +
                         `┃\n` +
                         `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                         `> Powered by SACHIYA MD 💫`;

      // 1. Send Preview Card with Info
      await sachiya.sendMessage(
        from,
        {
          image: {
            url: config.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true",
          },
          caption: captionMsg,
        },
        { quoted: mek }
      );

      // 2. Send the Actual Video File
      await sachiya.sendMessage(
        from,
        {
          video: { url: bestQualityUrl },
          caption: `📥 *Downloaded in ${qualityText}*\n\n> Powered by SACHIYA MD 💫`,
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.error("FB Downloader Error:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply(`❌ *Error:* ${e.message || "An unexpected error occurred!"}`);
    }
  }
);
