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
      
      // 1. Mentions (ටැග් කර ඇත්නම්), Reply කර ඇත්නම් හෝ නම්බර් එකක් දී ඇත්නම් බැලීම
      if (m.mentionedJid && m.mentionedJid.length > 0) {
        target = m.mentionedJid[0];
      } else if (quoted && quoted.sender) {
        target = quoted.sender;
      } else if (q) {
        let cleanedNum = q.replace(/[^0-9]/g, "");
        if (!cleanedNum) return reply("⚠️ *Please provide a valid phone number or mention someone!*");
        target = cleanedNum + "@s.whatsapp.net";
      } else {
        target = m.sender; // කිසිවක් දී නැත්නම් තමන්ගේම DP එක ලබා ගැනීම
      }

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      let dpUrl;
      try {
        // Fetch Profile Picture from WhatsApp
        dpUrl = await sachiya.profilePictureUrl(target, "image");
      } catch (e) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Unable to fetch profile picture! (User might have privacy settings enabled or no DP).*");
      }

      if (!dpUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Profile picture not found for this user!*");
      }

      const targetNumber = target.split("@")[0];

      const desc = `*─── ｢ 🖼️ PROFILE PICTURE ｣ ───*

👤 *Target User:* @${targetNumber}

> *SACHIYA-MD BOT* 💫`;

      // Send the DP Image with Caption and Mentions
      await sachiya.sendMessage(
        from,
        {
          image: { url: dpUrl },
          caption: desc,
          mentions: [target]
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.error("GetDP Error:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply(`❌ *Error:* ${e.message || "Failed to fetch DP!"}`);
    }
  }
);
