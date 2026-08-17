const { cmd } = require("../command");
const mongoose = require('mongoose');
const config = require('../config');

// MongoDB එකෙන් Block කරපු දත්ත ලබා ගැනීමට Schema එක
const BlockSchema = new mongoose.Schema({
  jid: { type: String, required: true, unique: true },
  type: { type: String, default: 'user' }, // user හෝ group
  date: { type: String }
});
const BlockModel = mongoose.models.Block || mongoose.model('Block', BlockSchema);

cmd(
  {
    pattern: "blocklist",
    alias: ["blist", "blocked"],
    desc: "View the list of blocked contacts and groups from Database",
    category: "owner",
    react: "🚫",
    filename: __filename,
  },
  async (sachiya, mek, m, { reply, senderNumber, sender }) => {
    try {
      // Owner නිවැරදිව පරීක්ෂා කිරීම
      const ownerConfig = String(config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
      const cleanSender = String(senderNumber || sender || '').replace(/[^0-9]/g, '');
      const botNumber = String(sachiya.user?.id || '').split('@')[0].replace(/[^0-9]/g, '');

      const isTrueOwner = mek.key.fromMe || cleanSender.includes(ownerConfig) || ownerConfig.includes(cleanSender) || cleanSender === botNumber;

      if (!isTrueOwner) {
        return reply("❌ *This command is only for the Owner!*");
      }

      const from = mek.key.remoteJid;

      // 1. MongoDB එකෙන් සහ Baileys බ්ලොක් ලිස්ට් දෙකම එකතු කර ගැනීම (Data මගහැරී යාම වැළැක්වීමට)
      let dbBlocked = [];
      try {
        if (mongoose.connection.readyState === 1) {
          dbBlocked = await BlockModel.find({});
        }
      } catch (err) {
        console.error("DB Fetch Error:", err);
      }

      let baileyBlocked = [];
      try {
        if (typeof sachiya.fetchBlocklist === 'function') {
          baileyBlocked = await sachiya.fetchBlocklist();
        }
      } catch (err) {}

      // සියලුම JID එකතු කර ඩුප්ලිකට් ඉවත් කිරීම
      let allBlockedJids = [...new Set([...dbBlocked.map(b => b.jid), ...(baileyBlocked || [])])]

      if (!allBlockedJids || allBlockedJids.length === 0) {
        return await sachiya.sendMessage(from, {
          image: { url: "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true" },
          caption: `╭━━━〔 *🚫 SACHIYA-MD BLOCK LIST* 〕━━━\n` +
                   `┃\n` +
                   `┃ ❌ *No blocked contacts or groups found in database!* \n` +
                   `┃\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *⚡ Powered by SACHIYA-MD 💫*`
        }, { quoted: mek });
      }

      let contactsList = [];
      let groupsList = [];

      for (let jid of allBlockedJids) {
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
          contactsList.push(`👤 *Contact:* \`+${number}\``);
        }
      }

      let caption = `╭━━━〔 *🚫 SACHIYA-MD BLOCK LIST* 〕━━━\n`;
      caption += `┃\n`;
      caption += `┃ 📊 *Total Blocked:* \`${allBlockedJids.length}\`\n`;
      caption += `┃ • *Blocked Contacts:* \`${contactsList.length}\`\n`;
      caption += `┃ • *Blocked Groups:* \`${groupsList.length}\`\n`;
      caption += `┃\n`;

      if (contactsList.length > 0) {
        caption += `╠═📂 *BLOCKED CONTACTS:*\n`;
        caption += contactsList.join('\n') + `\n`;
      }

      if (groupsList.length > 0) {
        caption += `╠═📂 *BLOCKED GROUPS:*\n`;
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
