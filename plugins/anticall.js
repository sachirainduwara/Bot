const { cmd } = require('../command');
const mongoose = require('mongoose');
const config = require('../config');

// MongoDB Schema for AntiCall settings
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
    if (doc) {
      anticallStatus = doc.status;
    } else {
      await AntiCallModel.create({ _id: 'sachiyamd_anticall_status', status: false });
      anticallStatus = false;
    }
  } catch (e) {
    console.error("❌ AntiCall Settings Load Error:", e);
  }
}

setTimeout(() => {
  loadAntiCallStatus();
}, 3000);

// Background Handler for AntiCall
function handleAntiCall(sachiya) {
  sachiya.ev.on('call', async (callEvents) => {
    try {
      if (!anticallStatus) return;

      for (const call of callEvents) {
        if (call.status === 'offer') {
          const callerJid = call.from;
          
          // 🛑 Group check: ගෘප් එකකින් එන call එකක් නම් සම්පූර්ණයෙන්ම මගහරියි (Ignore)
          const isGroup = callerJid.endsWith('@g.us') || (call.isGroup === true) || (call.chatId && call.chatId.endsWith('@g.us'));
          if (isGroup) continue;

          await sachiya.rejectCall(call.id, callerJid);
          await sachiya.sendMessage(callerJid, { 
            text: `⚠️ *Calls are not allowed! Please do not call me, drop a text instead.* 🚫` 
          });
        }
      }
    } catch (e) {
      console.error("AntiCall Error:", e);
    }
  });
}

module.exports = { handleAntiCall };
