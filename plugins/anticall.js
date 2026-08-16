const { cmd } = require("../command");
const mongoose = require('mongoose');
const config = require('../config');

// MongoDB Schema for AntiCall Status
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
    console.error("❌ AntiCall Status Load Error:", e);
  }
}

async function saveAntiCallStatus(status) {
  try {
    if (mongoose.connection.readyState === 0) return;
    await AntiCallModel.findOneAndUpdate(
      { _id: 'sachiyamd_anticall_status' },
      { status: status },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("❌ AntiCall Status Save Error:", e);
  }
}

setTimeout(() => {
  loadAntiCallStatus();
}, 3000);

// Anti-Call Event Listener Handler
function handleAntiCall(sachiya) {
  sachiya.ev.on('call', async (callEvents) => {
    if (!anticallStatus) return;

    for (const call of callEvents) {
      if (call.status === 'offer') {
        const callerJid = call.from;
        const isGroupCall = callerJid.endsWith('@g.us');

        // Ignore group calls completely
        if (isGroupCall) continue;

        try {
          // Reject the call instantly
          await sachiya.rejectCall(call.id, callerJid);

          // Send simple, elegant English warning message to inbox
          await sachiya.sendMessage(callerJid, { 
            text: `⚠️ *Calls are not allowed! Please do not call me, drop a text instead.* 🚫` 
          });
        } catch (e) {
          console.error("AntiCall Error:", e);
        }
      }
    }
  });
}

// Command for turning on/off AntiCall with direct config owner check
cmd(
  {
    pattern: "anticall",
    desc: "Enable or Disable Anti-Call system",
    category: "tools",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply, senderNumber }) => {
    // Owner validation directly using config and sender number
    const ownerNum = (config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
    const currentSender = (senderNumber || '').replace(/[^0-9]/g, '');
    const botNumber = (sachiya.user?.id || '').split('@')[0].replace(/[^0-9]/g, '');

    const isTrueOwner = (currentSender === ownerNum) || (currentSender === botNumber);

    if (!isTrueOwner) {
      return reply("❌ *This command is only for the Owner!*");
    }

    if (!q) {
      const statusText = anticallStatus ? "Enabled ✅" : "Disabled ❌";
      return reply(`╭━━━〔 *✨ SACHIYA-MD ANTICALL ✨* 〕━━━\n` +
                   `┃\n` +
                   `┃ ⚙️ *Current Status:* ${statusText}\n` +
                   `┃\n` +
                   `┃ *Available Commands:* \n` +
                   `┃ • \`.anticall on\` - Enable Anticall 🟢\n` +
                   `┃ • \`.anticall off\` - Disable Anticall 🔴\n` +
                   `┃\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *⚡ Powered by SACHIYA-MD 💫*`);
    }

    if (q.toLowerCase() === 'on') {
      anticallStatus = true;
      await saveAntiCallStatus(true);
      return reply("✅ *Anti-Call system has been enabled successfully!*");
    } else if (q.toLowerCase() === 'off') {
      anticallStatus = false;
      await saveAntiCallStatus(false);
      return reply("❌ *Anti-Call system has been disabled successfully!*");
    } else {
      return reply("⚠️ *Please use `.anticall on` or `.anticall off`*");
    }
  }
);

module.exports = { handleAntiCall };
