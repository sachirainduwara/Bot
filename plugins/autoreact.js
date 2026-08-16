const { cmd } = require("../command");
const mongoose = require('mongoose');
const config = require('../config');

// MongoDB Schema for AutoReact Status
const AutoReactSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  status: { type: Boolean, default: false }
});
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', AutoReactSchema);

let autoReactStatus = false;

// 150+ Beautiful & Cool Emojis Collection
const emojiList = [
  "❤️", "💖", "💗", "💓", "💞", "💕", "💘", "❤️‍🔥", "❤️‍🩹", "❣️", 
  "💔", "❤️", "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", 
  "🔥", "⭐", "🌟", "✨", "💫", "⚡", "💥", "🔥", "✨", "💫",
  "👍", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤞", "🤟", 
  "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👍",
  "😎", "🤓", "🧐", "🥳", "🤩", "😏", "😌", "😍", "🥰", "😘", 
  "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "👻", "💀",
  "☠️", "👽", "👾", "🤖", "🎃", "😺", "😸", "😹", "😻", "😼", 
  "😽", "🙀", "😿", "😾", "🙈", "🙉", "🙊", "🐵", "🐶", "🐱",
  "🦁", "🐯", "🦒", "🦊", "🦋", "🌸", "💮", "🌹", "🌺", "🌻", 
  "🌼", "🌷", "🌱", "🌲", "🌴", "🌵", "🌾", "🌿", "🍀", "🍁",
  "💎", "💍", "👑", "💄", "💋", "💌", "💤", "💬", "👁️‍🗨️", "🗨️",
  "💬", "💭", "💯", "💢", "♨️", "🔕", "🔔", "🔯", "🔮", "🚶",
  "🚀", "🛸", "🚁", "🚂", "✈️", "🛫", "🛬", "⛵", "🚤", "🛥️",
  "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️"
];

async function loadAutoReactStatus() {
  try {
    if (mongoose.connection.readyState === 0) return;
    let doc = await AutoReactModel.findOne({ _id: 'sachiyamd_autoreact_status' });
    if (doc) {
      autoReactStatus = doc.status;
    } else {
      await AutoReactModel.create({ _id: 'sachiyamd_autoreact_status', status: false });
      autoReactStatus = false;
    }
  } catch (e) {
    console.error("❌ AutoReact Status Load Error:", e);
  }
}

async function saveAutoReactStatus(status) {
  try {
    if (mongoose.connection.readyState === 0) return;
    await AutoReactModel.findOneAndUpdate(
      { _id: 'sachiyamd_autoreact_status' },
      { status: status },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("❌ AutoReact Status Save Error:", e);
  }
}

setTimeout(() => {
  loadAutoReactStatus();
}, 3000);

// Auto-React Global Message Handler
async function handleAutoReact(sachiya, mek) {
  if (!autoReactStatus) return;
  if (!mek || !mek.key) return;

  try {
    // Random emoji selection from the 150+ list
    const randomEmoji = emojiList[Math.floor(Math.random() * emojiList.length)];
    
    await sachiya.sendMessage(mek.key.remoteJid, {
      react: {
        text: randomEmoji,
        key: mek.key
      }
    });
  } catch (e) {
    // Error silent catch
  }
}

// Command for turning on/off AutoReact with owner check
cmd(
  {
    pattern: "autoreact",
    desc: "Enable or Disable Auto-React system for all incoming messages",
    category: "tools",
    react: "💖",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply, senderNumber, sender }) => {
    // Robust owner verification
    const ownerConfig = String(config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
    const cleanSender = String(senderNumber || sender || '').replace(/[^0-9]/g, '');
    const botNumber = String(sachiya.user?.id || '').split('@')[0].replace(/[^0-9]/g, '');

    const isTrueOwner = mek.key.fromMe || 
                        cleanSender.includes(ownerConfig) || 
                        ownerConfig.includes(cleanSender) || 
                        cleanSender === botNumber;

    if (!isTrueOwner) {
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
      return reply("❌ *This command is only for the Owner!*");
    }

    if (!q) {
      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } }).catch(() => {});
      const statusText = autoReactStatus ? "Enabled ✅" : "Disabled ❌";
      return reply(`╭━━━〔 *✨ SACHIYA-MD AUTOREACT ✨* 〕━━━\n` +
                   `┃\n` +
                   `┃ ⚙️ *Current Status:* ${statusText}\n` +
                   `┃ 🎨 *Total Emojis Pool:* 150+ Random\n` +
                   `┃\n` +
                   `┃ *Available Commands:* \n` +
                   `┃ • \`.autoreact on\` - Enable AutoReact 🟢\n` +
                   `┃ • \`.autoreact off\` - Disable AutoReact 🔴\n` +
                   `┃\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *⚡ Powered by SACHIYA-MD 💫*`);
    }

    if (q.toLowerCase() === 'on') {
      autoReactStatus = true;
      await saveAutoReactStatus(true);
      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});
      return reply("✅ *Auto-React system has been enabled successfully! (150+ Emojis Active)*");
    } else if (q.toLowerCase() === 'off') {
      autoReactStatus = false;
      await saveAutoReactStatus(false);
      await sachiya.sendMessage(from, { react: { text: "✔️", key: mek.key } }).catch(() => {});
      return reply("❌ *Auto-React system has been disabled successfully!*");
    } else {
      await sachiya.sendMessage(from, { react: { text: "⚠️", key: mek.key } }).catch(() => {});
      return reply("⚠️ *Please use `.autoreact on` or `.autoreact off`*");
    }
  }
);

module.exports = { handleAutoReact };
