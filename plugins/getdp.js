const { cmd } = require("../command");

cmd(
  {
    pattern: "getdp",
    alias: ["dp", "pfp"],
    react: "🖼️",
    desc: "Download Profile Picture of a tagged user, quoted user, number or inbox partner",
    category: "tools",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, quoted, q, reply, isGroup }) => {
    try {
      let target;
      
      // 1. Mentions (ටැග් කර ඇත්නම්)
      if (m.mentionedJid && m.mentionedJid.length > 0) {
        target = m.mentionedJid[0];
      } 
      // 2. Reply කර ඇත්නම්
      else if (quoted && quoted.sender) {
        target = quoted.sender;
      } 
      // 3. නම්බර් එකක් දී ඇත්නම් (උදා: .getdp 9477xxxxxxx)
      else if (q) {
        let cleanedNum = q.replace(/[^0-9]/g, "");
        if (!cleanedNum) return reply("⚠️ *Please provide a valid phone number or mention someone!*");
        target = cleanedNum + "@s.whatsapp.net";
      } 
      // 4. කිසිවක් දී නැතිනම්:
      else {
        if (!isGroup) {
          // Inbox (DM) එකක නම්: චැට් එකේ ඉන්න අනිත් කෙනාගේ JID එක ලබා ගැනීම (`from` කියන්නේ Inbox වලදී අදාළ යූගර්ගේ JID එකයි)
          target = from;
        } else {
          // Group එකක නම්: කමාන්ඩ් එක ගැහූ තමන්ගේම (sender) DP එක ලබා ගැනීම
          target = m.sender;
        }
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
