const mongoose = require('mongoose');

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

setTimeout(() => {
  loadAutoStatusSettings();
}, 3000);

// Background Handler for 100% Automatic Status Seen & Like for ALL Users
async function handleAutoStatus(sachiya, mek) {
  try {
    if (!autoStatusStatus) return;
    if (!mek || !mek.message) return;

    if (mek.key && mek.key.remoteJid === 'status@broadcast') {
      const participant = mek.key.participant || mek.participant;

      setTimeout(async () => {
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
        } catch (err) {
          try {
            await sachiya.sendMessage(mek.key.remoteJid, {
              react: {
                text: '💚',
                key: mek.key
              }
            });
          } catch (e) {}
        }
      }, 500);
    }
  } catch (e) {}
}

module.exports = { handleAutoStatus };
