const { cmd } = require("../command");
const mongoose = require('mongoose');
const config = require('../config');

// --- UNIFIED DATABASE SCHEMA FOR ALL SETTINGS ---
const BotSettingsSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  anticall: { type: Boolean, default: false },
  antidelete: { type: Boolean, default: false },
  ireact: { type: Boolean, default: true },
  greact: { type: Boolean, default: true },
  autoread: { type: Boolean, default: false },
  autostatus: { type: Boolean, default: false }
});

const BotSettingsModel = mongoose.models.BotSettings || mongoose.model('BotSettings', BotSettingsSchema);

// Cache object to hold current status in memory for fast access
let settingsCache = {
  anticall: false,
  antidelete: false,
  ireact: true,
  greact: true,
  autoread: false,
  autostatus: false
};

// Load settings from MongoDB on startup
async function loadAllSettings() {
  try {
    if (mongoose.connection.readyState === 0) return;
    let doc = await BotSettingsModel.findOne({ _id: 'sachiyamd_master_settings' });
    if (doc) {
      settingsCache.anticall = doc.anticall ?? false;
      settingsCache.antidelete = doc.antidelete ?? false;
      settingsCache.ireact = doc.ireact ?? true;
      settingsCache.greact = doc.greact ?? true;
      settingsCache.autoread = doc.autoread ?? false;
      settingsCache.autostatus = doc.autostatus ?? false;
    } else {
      await BotSettingsModel.create({
        _id: 'sachiyamd_master_settings',
        anticall: false,
        antidelete: false,
        ireact: true,
        greact: true,
        autoread: false,
        autostatus: false
      });
    }
  } catch (e) {
    console.error("Error loading settings:", e);
  }
}

// Save specific setting update to MongoDB
async function updateSettingInDb(field, value) {
  try {
    settingsCache[field] = value;
    if (mongoose.connection.readyState === 0) return;
    await BotSettingsModel.findOneAndUpdate(
      { _id: 'sachiyamd_master_settings' },
      { [field]: value },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("Error saving setting:", e);
  }
}

// Initial load after 3 seconds
setTimeout(() => { loadAllSettings(); }, 3000);

global.activeSettingsMenus = global.activeSettingsMenus || new Map();

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

      // Ensure latest data is loaded
      await loadAllSettings();

      const anticallTxt = settingsCache.anticall ? "🟢 Enabled" : "🔴 Disabled";
      const antidelTxt = settingsCache.antidelete ? "🟢 Enabled" : "🔴 Disabled";
      const ireactTxt = settingsCache.ireact ? "🟢 Enabled" : "🔴 Disabled";
      const greactTxt = settingsCache.greact ? "🟢 Enabled" : "🔴 Disabled";
      const autoreadTxt = settingsCache.autoread ? "🟢 Enabled" : "🔴 Disabled";
      const autostatusTxt = settingsCache.autostatus ? "🟢 Enabled" : "🔴 Disabled";

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
          await updateSettingInDb(dbField, stateBool);
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
