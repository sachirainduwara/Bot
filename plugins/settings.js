const { cmd } = require("../command");
const mongoose = require('mongoose');
const config = require('../config');

// --- DATABASE SCHEMA ---
const BotSettingsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: 'sachiyamd_settings' },
  anticall: { type: Boolean, default: false },
  antidelete: { type: Boolean, default: false },
  ireact: { type: Boolean, default: false },
  greact: { type: Boolean, default: false },
  autoread: { type: Boolean, default: false },
  autostatus: { type: Boolean, default: false }
});

const BotSettings = mongoose.models.BotSettings || mongoose.model('BotSettings', BotSettingsSchema);

// Helper function to get or create settings
async function fetchSettings() {
  try {
    let settings = await BotSettings.findOne({ id: 'sachiyamd_settings' });
    if (!settings) {
      settings = await BotSettings.create({ id: 'sachiyamd_settings' });
    }
    return settings;
  } catch (err) {
    console.error("Error fetching settings:", err);
    return { anticall: false, antidelete: false, ireact: false, greact: false, autoread: false, autostatus: false };
  }
}

// Helper to check if it's the Owner's Self Chat
function isSelfChat(sachiya, from, mek) {
  const botNumber = String(sachiya.user?.id || '').split('@')[0];
  const cleanFrom = String(from || '').replace(/[^0-9]/g, '');
  const cleanBotNum = String(botNumber).replace(/[^0-9]/g, '');
  
  return mek.key.fromMe || cleanFrom === cleanBotNum || (from.endsWith('@s.whatsapp.net') && cleanFrom === cleanBotNum);
}

// --- COMMAND: .settings ---
cmd(
  {
    pattern: "settings",
    alias: ["setting", "botsettings"],
    desc: "Manage all bot features and settings using UI panel and replies",
    category: "owner",
    react: "⚙️",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, reply }) => {
    try {
      if (!isSelfChat(sachiya, from, mek)) {
        return reply("❌ *Settings command can only be used in your Self Chat (Saved Messages) with the bot!*");
      }

      const settings = await fetchSettings();

      const anticallTxt = settings.anticall ? "🟢 Enabled" : "🔴 Disabled";
      const antidelTxt = settings.antidelete ? "🟢 Enabled" : "🔴 Disabled";
      const ireactTxt = settings.ireact ? "🟢 Enabled" : "🔴 Disabled";
      const greactTxt = settings.greact ? "🟢 Enabled" : "🔴 Disabled";
      const autoreadTxt = settings.autoread ? "🟢 Enabled" : "🔴 Disabled";
      const autostatusTxt = settings.autostatus ? "🟢 Enabled" : "🔴 Disabled";

      const settingsImg = config.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";

      const uiText = `╭━━━〔 *⚙️ SACHIYA-MD MASTER SETTINGS* 〕━━━\n` +
                     `┃\n` +
                     `┃ *1.* 📞 *Anti-Call:* ${anticallTxt}\n` +
                     `┃ *2.* 🛡️ *Anti-Delete:* ${antidelTxt}\n` +
                     `┃ *3.* 💬 *Inbox Auto-React:* ${ireactTxt}\n` +
                     `┃ *4.* 👥 *Group Auto-React:* ${greactTxt}\n` +
                     `┃ *5.* 👁️‍🗨️ *Auto-Read:* ${autoreadTxt}\n` +
                     `┃ *6.* 💚 *Auto-Status:* ${autostatusTxt}\n` +
                     `┃\n` +
                     `┣━━━〔 *HOW TO CHANGE* 〕━━━\n` +
                     `┃ • *Reply to this message with:* \`[Number] [on/off]\`\n` +
                     `┃ • *Example:* \`1 on\` or \`5 off\`\n` +
                     `┃\n` +
                     `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                     `> *⚡ Powered by SACHIYA-MD 💫*`;

      const sentMsg = await sachiya.sendMessage(
        from,
        {
          image: { url: settingsImg },
          caption: uiText,
        },
        { quoted: mek }
      );

      global.activeSettingsMenus = global.activeSettingsMenus || new Map();
      const messageID = sentMsg.key.id;
      global.activeSettingsMenus.set(messageID, { from });

      setTimeout(() => {
        global.activeSettingsMenus.delete(messageID);
      }, 30 * 60 * 1000);

    } catch (e) {
      console.error("Settings Error:", e);
      reply(`❌ *Error:* ${e.message}`);
    }
  }
);

// --- EVENT LISTENER FOR REPLIES ---
cmd(
  {
    on: "text",
    filename: __filename
  },
  async (sachiya, mek, m, { from, body }) => {
    try {
      const quoted = m.quoted;
      if (!quoted) return;
      
      const stanzaId = quoted.id;
      if (!stanzaId || !global.activeSettingsMenus || !global.activeSettingsMenus.has(stanzaId)) return;

      if (!isSelfChat(sachiya, from, mek)) return;

      const parts = body.trim().split(/ +/);
      const featureNum = parts[0];
      const action = parts[1] ? parts[1].toLowerCase() : "";

      if (action === 'on' || action === 'off') {
        const stateBool = (action === 'on');
        let featureName = "";
        let dbField = "";

        switch (featureNum) {
          case '1':
            dbField = "anticall";
            featureName = "📞 Anti-Call";
            break;
          case '2':
            dbField = "antidelete";
            featureName = "🛡️ Anti-Delete";
            break;
          case '3':
            dbField = "ireact";
            featureName = "💬 Inbox Auto-React";
            break;
          case '4':
            dbField = "greact";
            featureName = "👥 Group Auto-React";
            break;
          case '5':
            dbField = "autoread";
            featureName = "👁️‍🗨️ Auto-Read";
            break;
          case '6':
            dbField = "autostatus";
            featureName = "💚 Auto-Status";
            break;
        }

        if (dbField && featureName) {
          let settings = await fetchSettings();
          settings[dbField] = stateBool;
          await settings.save();

          const statusEmoji = stateBool ? "🟢 ENABLED" : "🔴 DISABLED";
          
          await sachiya.sendMessage(from, {
            text: `╭━━━〔 *✨ SETTINGS UPDATED ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ 📌 *Feature:* ${featureName}\n` +
                  `┃ ⚡ *New Status:* ${statusEmoji}\n` +
                  `┃ 💾 *Database:* Saved to MongoDB Atlas ✅\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*`
          }, { quoted: mek });

          await sachiya.sendMessage(from, { react: { text: stateBool ? "✅" : "❌", key: mek.key } }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Reply handler error:", err);
    }
  }
);
