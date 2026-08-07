const { cmd } = require("../command");

cmd(
  {
    pattern: "getdp",
    alias: ["dp", "pfp"],
    react: "🖼️",
    desc: "Download Profile Picture of a tagged user or number",
    category: "tools",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, quoted, q, reply }) => {
    try {
      let target;
      
      // 1. Mentions/ Tag කර ඇත්නම් හෝ Reply කර ඇත්නම්
      if (m.mentionedJid && m.mentionedJid[0]) {
        target = m.mentionedJid[0];
      } else if (quoted) {
        target = quoted.sender;
      } else if (q) {
        target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
      } else {
        target = m.sender; // තමන්ගේම DP එක
      }

      reply("⏳ *Fetching Profile Picture...*");

      let dpUrl;
      try {
        dpUrl = await sachiya.profilePictureUrl(target, "image");
      } catch (e) {
        return reply("❌ *Unable to fetch profile picture! (Privacy settings or no DP).*");
      }

      const desc = `*─── ｢ 🖼️ PROFILE PICTURE ｣ ───*

👤 *User:* @${target.split("@")[0]}

> *SACHIYA WHATSAPP MINI BOT* 🧬`;

      await sachiya.sendMessage(
        from,
        {
          image: { url: dpUrl },
          caption: desc,
          mentions: [target]
        },
        { quoted: mek }
      );

    } catch (e) {
      console.error(e);
      reply(`❌ *Error:* ${e.message || "Failed to fetch DP!"}`);
    }
  }
);
