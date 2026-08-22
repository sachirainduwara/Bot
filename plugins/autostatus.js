const { cmd } = require("../command");
const mongoose = require('mongoose');
const config = require('../config');

// MongoDB Schema for Auto Status Settings
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
    if (doc) {
      autoStatusStatus = doc.status;
    } else {
      await AutoStatusModel.create({ _id: 'sachiyamd_autostatus_settings', status: false });
      autoStatusStatus = false;
    }
  } catch (e) {
    console.error("❌ AutoStatus Settings Load Error:", e);
  }
}

async function saveAutoStatusSettings(status) {
  try {
    if (mongoose.connection.readyState === 0) return;
    await AutoStatusModel.findOneAndUpdate(
      { _id: 'sachiyamd_autostatus_settings' },
      { status: status },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("❌ AutoStatus Settings Save Error:", e);
  }
}

setTimeout(() => {
  loadAutoStatusSettings();
}, 3000);

// Background Handler for Instant Status Seen & Like (All users, no waiting)
async function handleAutoStatus(sachiya, mek) {
  try {
    if (!autoStatusStatus) return;
    if (!mek || !mek.message) return;

    if (mek.key && mek.key.remoteJid === 'status@broadcast') {
      const participant = mek.key.participant || mek.participant;

      // Instant execution without waiting for user interaction
      setImmediate(async () => {
        try {
          await sachiya.readMessages([mek.key]);
          if (participant) {
            await sachiya.sendMessage('status@broadcast', {
              react: {
                text: '💚',
                key: mek.key,
              }
            }, { statusJidList: [participant] });
          }
        } catch (e) {}
      });
    }
  } catch (e) {
    // Silent catch
  }
}

// Command for AutoStatus (.autostatus on / .autostatus off)
cmd(
  {
    pattern: "autostatus",
    alias: ["autoreadstatus", "astatus"],
    desc: "Enable or Disable Auto Status Read and Like",
    category: "owner",
    react: "⚙️",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply, senderNumber, sender }) => {
    const ownerConfig = String(config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
    const cleanSender = String(senderNumber || sender || '').replace(/[^0-9]/g, '');
    const botNumber = String(sachiya.user?.id || '').split('@')[0].replace(/[^0-9]/g, '');

    const isTrueOwner = mek.key.fromMe || cleanSender.includes(ownerConfig) || ownerConfig.includes(cleanSender) || cleanSender === botNumber;

    if (!isTrueOwner) {
      return reply("❌ *This command is only for the Owner!*");
    }

    if (!q) {
      const statusText = autoStatusStatus ? "Enabled ✅" : "Disabled ❌";
      return reply(`╭━━━〔 *✨ SACHIYA-MD AUTOSTATUS ✨* 〕━━━\n` +
                   `┃\n` +
                   `┃ ⚙️ *Auto Status:* ${statusText}\n` +
                   `┃ 💚 *Mode:* Instant Auto View & Like (All Users)\n` +
                   `┃\n` +
                   `┃ *Commands:* \n` +
                   `┃ • \`.autostatus on\` - Enable 🟢\n` +
                   `┃ • \`.autostatus off\` - Disable 🔴\n` +
                   `┃\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *⚡ Powered by SACHIYA-MD 💫*`);
    }

    if (q.toLowerCase() === 'on') {
      autoStatusStatus = true;
      await saveAutoStatusSettings(true);
      return reply("✅ *Auto Status Read & Like has been enabled successfully!*");
    } else if (q.toLowerCase() === 'off') {
      autoStatusStatus = false;
      await saveAutoStatusSettings(false);
      return reply("❌ *Auto Status Read & Like has been disabled successfully!*");
    } else {
      return reply("⚠️ *Please use `.autostatus on` or `.autostatus off`*");
    }
  }
);

module.exports = { handleAutoStatus };
