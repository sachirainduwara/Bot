const { cmd } = require("../command");
const mongoose = require('mongoose');
const config = require('../config');

// --- ROBUST DATABASE SCHEMA ---
const BotSettingsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: 'sachiyamd_master_config_v1' },
  anticall: { type: Boolean, default: false },
  antidelete: { type: Boolean, default: false },
  ireact: { type: Boolean, default: false },
  greact: { type: Boolean, default: false },
  autoread: { type: Boolean, default: false },
  autostatus: { type: Boolean, default: false }
});

const BotSettings = mongoose.models.BotSettings || mongoose.model('BotSettings', BotSettingsSchema);

// --- BULLETPROOF SETTINGS FETCH FUNCTION ---
async function getBotSettings() {
  try {
    let settings = await BotSettings.findOne({ id: 'sachiyamd_master_config_v1' });
    if (!settings) {
      settings = await BotSettings.create({ 
        id: 'sachiyamd_master_config_v1',
        anticall: false,
        antidelete: false,
        ireact: false,
        greact: false,
        autoread: false,
        autostatus: false
      });
    }
    return settings.toObject ? settings.toObject() : settings;
  } catch (err) {
    console.error("Database Fetch Error:", err);
    return { 
      anticall: false, 
      antidelete: false, 
      ireact: false, 
      greact: false, 
      autoread: false, 
      autostatus: false 
    };
  }
}

// --- OWNER VALIDATION HELPER ---
function isSelfChat(sachiya, from, mek) {
  try {
    const botNumber = String(sachiya.user?.id || '').split('@')[0];
    const cleanFrom = String(from || '').replace(/[^0-9]/g, '');
    const cleanBotNum = String(botNumber).replace(/[^0-9]/g, '');
    return mek.key.fromMe || cleanFrom === cleanBotNum || (from.endsWith('@s.whatsapp.net') && cleanFrom === cleanBotNum);
  } catch (e) {
    return mek.key.fromMe || false;
  }
}

// Export global function for other plugins
global.getBotConfig = getBotSettings;

// --- COMMAND: .settings ---
cmd(
  {
    pattern: "settings",
    alias: ["setting", "botsettings"],
    desc: "Manage all bot features and settings securely",
    category: "owner",
    react: "⚙️",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, reply }) => {
    try {
      if (!isSelfChat(sachiya, from, mek)) {
        return reply("❌ *Settings command can only be used in your Self Chat with the bot!*");
      }

      // Fetch absolute latest configuration from database
      const settings = await getBotSettings();

      const anticallTxt = settings.anticall === true ? "🟢 Enabled" : "🔴 Disabled";
      const antidelTxt = settings.antidelete === true ? "🟢 Enabled" : "🔴 Disabled";
      const ireactTxt = settings.ireact === true ? "🟢 Enabled" : "🔴 Disabled";
      const greactTxt = settings.greact === true ? "🟢 Enabled" : "🔴 Disabled";
      const autoreadTxt = settings.autoread === true ? "🟢 Enabled" : "🔴 Disabled";
      const autostatusTxt = settings.autostatus === true ? "🟢 Enabled" : "🔴 Disabled";

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

      const sentMsg = await sachiya.sendMessage(from, { image: { url: settingsImg }, caption: uiText }, { quoted: mek });

      global.activeSettingsMenus = global.activeSettingsMenus || new Map();
      global.activeSettingsMenus.set(sentMsg.key.id, { from });

      // Clean up memory map after 30 minutes
      setTimeout(() => {
        global.activeSettingsMenus.delete(sentMsg.key.id);
      }, 30 * 60 * 1000);

    } catch (e) {
      console.error("Settings Command Error:", e);
      reply(`❌ *Error:* ${e.message}`);
    }
  }
);

// --- INTERACTIVE REPLY LISTENER FOR CONFIGURATION ---
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

      const cleanBody = body ? body.trim() : "";
      const parts = cleanBody.split(/ +/);
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
          // Force atomic update to Mongo DB document directly
          const updateObj = {};
          updateObj[dbField] = stateBool;

          await BotSettings.findOneAndUpdate(
            { id: 'sachiyamd_master_config_v1' },
            { $set: updateObj },
            { upsert: true, new: true, runValidators: true }
          );

          const statusEmoji = stateBool ? "🟢 ENABLED" : "🔴 DISABLED";
          
          await sachiya.sendMessage(from, {
            text: `╭━━━〔 *✨ SETTINGS UPDATED ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ 📌 *Feature:* ${featureName}\n` +
                  `┃ ⚡ *New Status:* ${statusEmoji}\n` +
                  `┃ 💾 *Database:* Saved Successfully ✅\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*`
          }, { quoted: mek });

          await sachiya.sendMessage(from, { react: { text: stateBool ? "✅" : "❌", key: mek.key } }).catch(() => {});
        }
      }
    } catch (err) {
      console.error("Settings Reply Handler Error:", err);
    }
  }
);
