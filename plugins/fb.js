const { cmd, commands } = require("../command");
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
      botNumber2,
      botNumber,
      pushname,
      isMe,
      isOwner,
      groupMetadata,
      groupName,
      participants,
      groupAdmins,
      isBotAdmins,
      isAdmins,
      reply,
    }
  ) => {
    try {
      if (!q) return reply("⚠️ *Please provide a valid Facebook video URL!*");

      const fbRegex = /(https?:\/\/)?(www\.|m\.)?(facebook|fb)\.(com|watch)\/.+/;
      if (!fbRegex.test(q)) {
        return reply("❌ *Invalid Facebook URL! Please check and try again.*");
      }

      reply("⏳ *Downloading your Facebook video...*");

      const result = await getFbVideoInfo(q);
      if (!result || (!result.sd && !result.hd)) {
        return reply("❌ *Failed to download video. Video might be private or invalid!*");
      }

      const { title, sd, hd } = result;
      const bestQualityUrl = hd || sd;
      const qualityText = hd ? "HD 4K" : "SD Standard";

      const captionMsg = `╭━━━〔 *FACEBOOK DOWNLOADER* 〕━━━\n` +
                         `┃\n` +
                         `┃ 🎬 *Title:* ${title || "Facebook Video"}\n` +
                         `┃ 📊 *Quality:* ${qualityText}\n` +
                         `┃ 👤 *User:* ${pushname || "User"}\n` +
                         `┃\n` +
                         `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                         `> Powered by SACHIYA MD`;

      // 1. Send Preview Image with Info
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

      // 2. Send the Video
      await sachiya.sendMessage(
        from,
        {
          video: { url: bestQualityUrl },
          caption: `📥 *Downloaded in ${qualityText} Quality*\n\n> Powered by SACHIYA MD`,
        },
        { quoted: mek }
      );

    } catch (e) {
      console.error("FB Downloader Error:", e);
      reply(`❌ *Error:* ${e.message || e}`);
    }
  }
);
