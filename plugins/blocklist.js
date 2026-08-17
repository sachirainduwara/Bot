const { cmd } = require("../command");

cmd(
  {
    pattern: "blocklist",
    alias: ["blist", "blocked"],
    desc: "View the list of blocked contacts and groups by the bot",
    category: "owner",
    react: "🚫",
    filename: __filename,
  },
  async (sachiya, mek, m, { reply, isOwner, from }) => {
    try {
      // Owner පරීක්ෂාව
      if (!isOwner) {
        return reply("❌ *This command is only for the Owner!*");
      }

      // බොට් විසින් බ්ලොක් කර ඇති සියලුම JID (Contacts & Groups) ලබා ගැනීම
      const blockedContacts = typeof sachiya.fetchBlocklist === 'function' 
        ? await sachiya.fetchBlocklist() 
        : (sachiya.blocklist || []);

      if (!blockedContacts || blockedContacts.length === 0) {
        return await sachiya.sendMessage(from, {
          image: { url: "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true" },
          caption: `╭━━━〔 *🚫 SACHIYA-MD BLOCK LIST* 〕━━━\n` +
                   `┃\n` +
                   `┃ ❌ *No blocked contacts or groups found!* \n` +
                   `┃\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *⚡ Powered by SACHIYA-MD 💫*`
        }, { quoted: mek });
      }

      let contactsList = [];
      let groupsList = [];

      // Contact සහ Group ලෙස වෙන් කර ගැනීම
      for (let jid of blockedContacts) {
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
      caption += `┃ 📊 *Total Blocked:* \`${blockedContacts.length}\`\n`;
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

      // පින්තූරය සමඟ මැසේජ් එක යැවීම
      await sachiya.sendMessage(from, {
        image: { url: "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true" },
        caption: caption
      }, { quoted: mek });

    } catch (e) {
      console.error("Blocklist Error:", e);
      return reply(`❌ *An error occurred while fetching the block list:* ${e.message}`);
    }
  }
);
