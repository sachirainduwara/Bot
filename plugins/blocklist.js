const { cmd } = require("../command");
const mongoose = require('mongoose');
const config = require('../config');

// සාමාන්‍යයෙන් බොට්ස්ලා block/mute සටහන් කරගන්නා MongoDB Schema එක
const BlockChatSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }
});
const BlockChatModel = mongoose.models.BanChats || mongoose.models.BlockChat || mongoose.model('BlockChat', BlockChatSchema);

cmd(
  {
    pattern: "blocklist",
    alias: ["blist", "blockedchats", "bannedchats"],
    desc: "View the list of chats and groups where bot replies are disabled",
    category: "owner",
    react: "🚫",
    filename: __filename,
  },
  async (sachiya, mek, m, { reply, senderNumber, sender, from }) => {
    try {
      // Owner නිවැරදිව පරීක්ෂා කිරීම
      const ownerConfig = String(config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
      const cleanSender = String(senderNumber || sender || '').replace(/[^0-9]/g, '');
      const botNumber = String(sachiya.user?.id || '').split('@')[0].replace(/[^0-9]/g, '');

      const isTrueOwner = mek.key.fromMe || cleanSender.includes(ownerConfig) || ownerConfig.includes(cleanSender) || cleanSender === botNumber;

      if (!isTrueOwner) {
        return reply("❌ *This command is only for the Owner!*");
      }

      // MongoDB එකෙන් බොට් රිප්ලයි නැවැත්වූ (Blocked/Banned) චැට්ස් සහ ගෘප්ස් ලබා ගැනීම
      let blockedChats = [];
      try {
        if (mongoose.connection.readyState === 1) {
          // විවිධ මොඩල් නම් වලට දත්ත තිබිය හැකි නිසා ඒවා පරීක්ෂා කිරීම
          const collections = mongoose.connection.collections;
          
          if (collections['blockchats'] || collections['banchats'] || collections['chats']) {
            blockedChats = await BlockChatModel.find({});
          } else {
            // වෙනත් විදිහකට save වී ඇත්නම් සියලුම models බලමු
            blockedChats = await BlockChatModel.find({}).catch(() => []);
          }
        }
      } catch (err) {
        console.error("DB Fetch Error:", err);
      }

      if (!blockedChats || blockedChats.length === 0) {
        return await sachiya.sendMessage(from, {
          image: { url: "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true" },
          caption: `╭━━━〔 *🚫 BLOCKED CHATS LIST* 〕━━━\n` +
                   `┃\n` +
                   `┃ ❌ *No muted/blocked chats found where bot replies are disabled!* \n` +
                   `┃\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *⚡ Powered by SACHIYA-MD 💫*`
        }, { quoted: mek });
      }

      let contactsList = [];
      let groupsList = [];

      for (let item of blockedChats) {
        let jid = item.id || item.jid || item.chatId;
        if (!jid) continue;

        if (jid.endsWith('@g.us')) {
          let groupName = "Unknown Group";
          try {
            let metadata = await sachiya.groupMetadata(jid).catch(() => {});
            if (metadata && metadata.subject) {
              groupName = metadata.subject;
            }
          } catch (e) {}
          groupsList.push(`👥 *Group:* ${groupName}\n   • \`${jid}\``);
        } else {
          let number = jid.split('@')[0];
          contactsList.push(`👤 *Inbox:* \`+${number}\``);
        }
      }

      let caption = `╭━━━〔 *🚫 BLOCKED CHATS LIST* 〕━━━\n`;
      caption += `┃\n`;
      caption += `┃ 📊 *Total Blocked Chats:* \`${blockedChats.length}\`\n`;
      caption += `┃ • *Inbox Chats:* \`${contactsList.length}\`\n`;
      caption += `┃ • *Groups:* \`${groupsList.length}\`\n`;
      caption += `┃\n`;

      if (contactsList.length > 0) {
        caption += `╠═📂 *INBOX (BOT REPLIES STOPPED):*\n`;
        caption += contactsList.join('\n') + `\n`;
      }

      if (groupsList.length > 0) {
        caption += `╠═📂 *GROUPS (BOT REPLIES STOPPED):*\n`;
        caption += groupsList.join('\n') + `\n`;
      }

      caption += `┃\n`;
      caption += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      caption += `> *⚡ Powered by SACHIYA-MD 💫*`;

      await sachiya.sendMessage(from, {
        image: { url: "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true" },
        caption: caption
      }, { quoted: mek });

    } catch (e) {
      console.error("Blocklist Error:", e);
      return reply(`❌ *An error occurred:* ${e.message}`);
    }
  }
);
