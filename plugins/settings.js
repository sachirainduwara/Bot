const { cmd } = require("../command");
const mongoose = require('mongoose');
const config = require('../config');

// --- 1. AntiCall Schema & Functions ---
const AntiCallSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  status: { type: Boolean, default: false }
});
const AntiCallModel = mongoose.models.AntiCall || mongoose.model('AntiCall', AntiCallSchema);
let anticallStatus = false;

async function loadAntiCallStatus() {
  try {
    if (mongoose.connection.readyState === 0) return;
    let doc = await AntiCallModel.findOne({ _id: 'sachiyamd_anticall_status' });
    if (doc) anticallStatus = doc.status;
    else {
      await AntiCallModel.create({ _id: 'sachiyamd_anticall_status', status: false });
      anticallStatus = false;
    }
  } catch (e) {}
}
async function saveAntiCallStatus(status) {
  try {
    if (mongoose.connection.readyState === 0) return;
    await AntiCallModel.findOneAndUpdate({ _id: 'sachiyamd_anticall_status' }, { status: status }, { upsert: true, new: true });
  } catch (e) {}
}
setTimeout(() => { loadAntiCallStatus(); }, 3000);


// --- 2. Antidelete Schema & Functions ---
const AntideleteSchema = new mongoose.Schema({
  _id: { type: String, required: true, default: 'sachiyamd_antidelete_status' },
  enabled: { type: Boolean, default: false }
});
const AntideleteModel = mongoose.models.Antidelete || mongoose.model('Antidelete', AntideleteSchema);

async function loadAntideleteConfig() {
    if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return { enabled: false };
    try {
        if (mongoose.connection.readyState === 0) await mongoose.connect(config.SESSION_ID);
        let doc = await AntideleteModel.findOne({ _id: 'sachiyamd_antidelete_status' });
        if (!doc) doc = await AntideleteModel.create({ _id: 'sachiyamd_antidelete_status', enabled: false });
        return { enabled: doc.enabled };
    } catch (e) { return { enabled: false }; }
}
async function saveAntideleteConfig(isEnabled) {
    if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
    try {
        if (mongoose.connection.readyState === 0) await mongoose.connect(config.SESSION_ID);
        await AntideleteModel.findOneAndUpdate({ _id: 'sachiyamd_antidelete_status' }, { enabled: isEnabled }, { upsert: true, new: true });
    } catch (e) {}
}


// --- 3. AutoReact Schema & Functions ---
const AutoReactSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  ireact: { type: Boolean, default: true },
  greact: { type: Boolean, default: true }
});
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', AutoReactSchema);
let iReactStatus = true;
let gReactStatus = true;

async function loadAutoReactSettings() {
  try {
    if (mongoose.connection.readyState === 0) return;
    let doc = await AutoReactModel.findOne({ _id: 'sachiyamd_autoreact_settings' });
    if (doc) {
      iReactStatus = doc.ireact;
      gReactStatus = doc.greact;
    } else {
      await AutoReactModel.create({ _id: 'sachiyamd_autoreact_settings', ireact: true, greact: true });
      iReactStatus = true;
      gReactStatus = true;
    }
  } catch (e) {}
}
async function saveAutoReactSettings(type, status) {
  try {
    if (mongoose.connection.readyState === 0) return;
    let updateObj = type === 'ireact' ? { ireact: status } : { greact: status };
    await AutoReactModel.findOneAndUpdate({ _id: 'sachiyamd_autoreact_settings' }, updateObj, { upsert: true, new: true });
  } catch (e) {}
}
setTimeout(() => { loadAutoReactSettings(); }, 3000);


// --- 4. AutoRead Schema & Functions ---
const AutoReadSchema = new mongoose.Schema({
    _id: { type: String, required: true, default: 'autoread_config' },
    enabled: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});
const AutoReadModel = mongoose.models.AutoRead || mongoose.model('AutoRead', AutoReadSchema);

async function loadAutoReadConfig() {
    try {
        if (mongoose.connection.readyState === 0 && config.SESSION_ID) await mongoose.connect(config.SESSION_ID);
        let doc = await AutoReadModel.findOne({ _id: 'autoread_config' });
        if (!doc) doc = await AutoReadModel.create({ _id: 'autoread_config', enabled: false });
        return { enabled: doc.enabled };
    } catch (e) { return { enabled: false }; }
}
async function saveAutoReadConfig(isEnabled) {
    try {
        if (mongoose.connection.readyState === 0 && config.SESSION_ID) await mongoose.connect(config.SESSION_ID);
        await AutoReadModel.findOneAndUpdate({ _id: 'autoread_config' }, { enabled: isEnabled, updatedAt: new Date() }, { upsert: true, new: true });
    } catch (e) {}
}


// --- 5. AutoStatus Schema & Functions ---
const AutoStatusSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  status: { type: Boolean, default: false }
});
const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', AutoStatusSchema);
let autoStatusStatus = false;

async function loadAutoStatusSettings() {
  try {
    if (mongoose.connection.readyState === 0) return;
    let doc = await AutoStatusModel.findOne({ _id: 'sachiyamd_autostatus_settings' });
    if (doc) autoStatusStatus = doc.status;
    else {
      await AutoStatusModel.create({ _id: 'sachiyamd_autostatus_settings', status: false });
      autoStatusStatus = false;
    }
  } catch (e) {}
}
async function saveAutoStatusSettings(status) {
  try {
    if (mongoose.connection.readyState === 0) return;
    await AutoStatusModel.findOneAndUpdate({ _id: 'sachiyamd_autostatus_settings' }, { status: status }, { upsert: true, new: true });
  } catch (e) {}
}
setTimeout(() => { loadAutoStatusSettings(); }, 3000);


// --- MASTER SETTINGS COMMAND (.settings) ---
cmd(
  {
    pattern: "settings",
    alias: ["setting", "botsettings"],
    desc: "Manage all bot features and settings using UI panel and replies",
    category: "owner",
    react: "⚙️",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply, senderNumber, sender }) => {
    try {
      // Owner Verification
      const ownerConfig = String(config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
      const cleanSender = String(senderNumber || sender || '').replace(/[^0-9]/g, '');
      const botNumber = String(sachiya.user?.id || '').split('@')[0].replace(/[^0-9]/g, '');
      const isTrueOwner = mek.key.fromMe || cleanSender.includes(ownerConfig) || ownerConfig.includes(cleanSender) || cleanSender === botNumber;

      if (!isTrueOwner) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
        return reply("❌ *This command is only for the Owner!*");
      }

      // Load latest statuses
      const antidelCfg = await loadAntideleteConfig();
      const autoreadCfg = await loadAutoReadConfig();

      const anticallTxt = anticallStatus ? "🟢 Enabled" : "🔴 Disabled";
      const antidelTxt = antidelCfg.enabled ? "🟢 Enabled" : "🔴 Disabled";
      const ireactTxt = iReactStatus ? "🟢 Enabled" : "🔴 Disabled";
      const greactTxt = gReactStatus ? "🟢 Enabled" : "🔴 Disabled";
      const autoreadTxt = autoreadCfg.enabled ? "🟢 Enabled" : "🔴 Disabled";
      const autostatusTxt = autoStatusStatus ? "🟢 Enabled" : "🔴 Disabled";

      // Default UI Panel Display Text
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

      // 1. Send Preview Card with Menu
      await sachiya.sendMessage(from, { react: { text: "🎨", key: mek.key } }).catch(() => {});
      const sentMsg = await sachiya.sendMessage(
        from,
        {
          image: { url: settingsImg },
          caption: uiText,
        },
        { quoted: mek }
      );

      // 2. Listen for User Reply (using exact messageID listener like your example)
      const messageID = sentMsg.key.id;

      const settingsListener = async (chatUpdate) => {
        try {
          const mekResponse = chatUpdate.messages[0];
          if (!mekResponse.message) return;

          const responseMessage = mekResponse.message.conversation || mekResponse.message.extendedTextMessage?.text || "";
          const senderID = mekResponse.key.remoteJid;
          const isReplyToSent = mekResponse.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

          if (isReplyToSent && senderID === from) {
            // Remove listener so it doesn't trigger multiple times
            sachiya.ev.off("messages.upsert", settingsListener);

            await sachiya.sendMessage(from, { react: { text: "⏳", key: mekResponse.key } }).catch(() => {});

            // Parse response e.g., "1 on" or "5 off"
            const parts = responseMessage.trim().split(/ +/);
            const featureNum = parts[0];
            const action = parts[1] ? parts[1].toLowerCase() : "";

            if (action !== 'on' && action !== 'off') {
              return sachiya.sendMessage(from, { text: "⚠️ *Please use correct format like `1 on` or `5 off`!*" }, { quoted: mekResponse });
            }

            const stateBool = (action === 'on');
            let featureName = "";

            switch (featureNum) {
              case '1':
                anticallStatus = stateBool;
                await saveAntiCallStatus(stateBool);
                featureName = "📞 Anti-Call";
                break;
              case '2':
                await saveAntideleteConfig(stateBool);
                featureName = "🛡️ Anti-Delete";
                break;
              case '3':
                iReactStatus = stateBool;
                await saveAutoReactSettings('ireact', stateBool);
                featureName = "💬 Inbox Auto-React";
                break;
              case '4':
                gReactStatus = stateBool;
                await saveAutoReactSettings('greact', stateBool);
                featureName = "👥 Group Auto-React";
                break;
              case '5':
                await saveAutoReadConfig(stateBool);
                featureName = "👁️‍🗨️ Auto-Read";
                break;
              case '6':
                autoStatusStatus = stateBool;
                await saveAutoStatusSettings(stateBool);
                featureName = "💚 Auto-Status";
                break;
              default:
                return sachiya.sendMessage(from, { text: "❌ *Invalid Feature Number! Please select a number between 1 and 6.*" }, { quoted: mekResponse });
            }

            // 🌟 Success Message with Image and Emojis
            const successImg = config.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";
            const statusEmoji = stateBool ? "🟢 ENABLED" : "🔴 DISABLED";

            await sachiya.sendMessage(from, {
              image: { url: successImg },
              caption: `╭━━━〔 *✨ SETTINGS UPDATED ✨* 〕━━━\n` +
                       `┃\n` +
                       `┃ 📌 *Feature:* ${featureName}\n` +
                       `┃ ⚡ *New Status:* ${statusEmoji}\n` +
                       `┃ 💾 *Database:* Saved to MongoDB Atlas ✅\n` +
                       `┃\n` +
                       `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                       `> *⚡ Powered by SACHIYA-MD 💫*`,
            }, { quoted: mekResponse });

            await sachiya.sendMessage(from, { react: { text: stateBool ? "✅" : "❌", key: mekResponse.key } }).catch(() => {});
          }
        } catch (err) {
          console.error("Settings Reply Error:", err);
        }
      };

      sachiya.ev.on("messages.upsert", settingsListener);

    } catch (e) {
      console.error("Settings Error:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
      reply(`❌ *Error:* ${e.message || "An unexpected error occurred!"}`);
    }
  }
);
