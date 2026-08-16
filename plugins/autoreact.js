const { cmd } = require("../command");
const mongoose = require('mongoose');
const config = require('../config');

// MongoDB Schema for AutoReact Settings (Inbox & Group separate)
const AutoReactSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  ireact: { type: Boolean, default: true },
  greact: { type: Boolean, default: true }
});
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', AutoReactSchema);

let iReactStatus = true;
let gReactStatus = true;

// ලස්සන සහ හොඳ ඉමෝජි 150+ ප්‍රමාණයක එකතුව
const goodEmojis = [
  "❤️", "💖", "💗", "💓", "💞", "💕", "💘", "❤️‍🔥", "❤️‍🩹", "❣️", 
  "🧡", "💛", "💚", "💙", "💜", "🤎", "🖤", "🤍", "🔥", "⭐", 
  "🌟", "✨", "💫", "⚡", "💥", "👍", "👏", "🙌", "👐", "🤲", 
  "🤝", "🙏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", 
  "🖕", "👇", "☝️", "🫵", "😎", "🤓", "🧐", "🥳", "🤩", "😏", 
  "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", 
  "😜", "🤪", "👻", "💀", "👽", "👾", "🤖", "🎃", "😺", "😸", 
  "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🙈", "🙉", "🙊", 
  "🐵", "🐶", "🐱", "🦁", "🐯", "🦒", "🦊", "🦋", "🌸", "💮", 
  "🌹", "🌺", "🌻", "🌼", "🌷", "🌱", "🌲", "🌴", "🌵", "🌾", 
  "🌿", "🍀", "🍁", "💎", "💍", "👑", "💄", "💋", "💌", "💤", 
  "💬", "💯", "💢", "♨️", "🔕", "🔔", "🔯", "🔮", "🚀", "🛸", 
  "🚁", "🚂", "✈️", "🛫", "🛬", "⛵", "🚤", "🛥️", "🎉", "🎊", 
  "🎈", "🎁", "🏆", "🥇", "🥈", "🥉", "🏅", "🎖️", "🌈", "☀️",
  "🌤️", "🌙", "🌊", "🪄", "🔮", "🧿", "🎐", "🎑", "🎍", "🎏"
];

// නරක වචන සඳහා කතා/තරහ ගිය ඉමෝජි
const badEmojis = ['🤮', '🤬', '😡', '💩', '⚠️', '❌', '👿', '🖕', '👎', '💀', '🤡', '👺', '👹', '😒', '🙄'];

// නරක වචන ලැයිස්තුව (Sinhala & English bad words)
const badWords = [
  'huththa', 'pukka', 'pakaya', 'ponnaya', 'bayya', 'aya', 'kariya', 'balla', 'tho', 'thoage',
  'hutto', 'fari', 'huththo', 'gon_pakaya', 'kora', 'maranawa', 'thowa', 'huththige', 'fuck', 'bitch', 
  'bastard', 'asshole', 'idiot', 'shit', 'damn', 'cunt', 'pussy', 'dick', 'pakayo', 'wesa', 'wesige', 
  'huththi', 'ponna', 'kari'
];

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
  } catch (e) {
    console.error("❌ AutoReact Settings Load Error:", e);
  }
}

async function saveAutoReactSettings(type, status) {
  try {
    if (mongoose.connection.readyState === 0) return;
    let updateObj = type === 'ireact' ? { ireact: status } : { greact: status };
    await AutoReactModel.findOneAndUpdate(
      { _id: 'sachiyamd_autoreact_settings' },
      updateObj,
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("❌ AutoReact Settings Save Error:", e);
  }
}

setTimeout(() => {
  loadAutoReactSettings();
}, 3000);

// Auto-React Global Message Handler
async function handleAutoReact(sachiya, mek) {
  try {
    if (!mek || !mek.message || mek.key.fromMe) return;
    if (mek.key.remoteJid === 'status@broadcast') return;

    const from = mek.key.remoteJid;
    const isGroup = from.endsWith('@g.us');

    // Check status based on chat type
    if (isGroup && !gReactStatus) return;
    if (!isGroup && !iReactStatus) return;

    let body = '';
    const msgType = Object.keys(mek.message)[0];
    
    if (msgType === 'conversation') {
      body = mek.message.conversation;
    } else if (msgType === 'extendedTextMessage') {
      body = mek.message.extendedTextMessage.text;
    } else if (msgType === 'imageMessage') {
      body = mek.message.imageMessage.caption;
    } else if (msgType === 'videoMessage') {
      body = mek.message.videoMessage.caption;
    }

    if (!body) return;

    const lowerBody = body.toLowerCase();
    const words = lowerBody.split(/\s+/);
    let isBadMessage = badWords.some(word => words.includes(word) || lowerBody.includes(word));

    let selectedEmoji = '';
    if (isBadMessage) {
      selectedEmoji = badEmojis[Math.floor(Math.random() * badEmojis.length)];
    } else {
      selectedEmoji = goodEmojis[Math.floor(Math.random() * goodEmojis.length)];
    }

    await sachiya.sendMessage(from, {
      react: {
        text: selectedEmoji,
        key: mek.key
      }
    }).catch(() => {});
  } catch (e) {
    // Silent catch
  }
}

// 1. Command for Inbox AutoReact (.ireact on / .ireact off)
cmd(
  {
    pattern: "ireact",
    desc: "Enable or Disable Auto-React for Inbox (Private Chats)",
    category: "owner",
    react: "💬",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply, senderNumber, sender, isGroup }) => {
    if (isGroup) {
      return reply("❌ *This command is only for Inbox (Private Chats)! Use `.greact` for groups.*");
    }

    const ownerConfig = String(config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
    const cleanSender = String(senderNumber || sender || '').replace(/[^0-9]/g, '');
    const botNumber = String(sachiya.user?.id || '').split('@')[0].replace(/[^0-9]/g, '');

    const isTrueOwner = mek.key.fromMe || cleanSender.includes(ownerConfig) || ownerConfig.includes(cleanSender) || cleanSender === botNumber;

    if (!isTrueOwner) {
      return reply("❌ *This command is only for the Owner!*");
    }

    if (!q) {
      const statusText = iReactStatus ? "Enabled ✅" : "Disabled ❌";
      return reply(`╭━━━〔 *✨ SACHIYA-MD IREACT ✨* 〕━━━\n` +
                   `┃\n` +
                   `┃ 💬 *Inbox AutoReact:* ${statusText}\n` +
                   `┃\n` +
                   `┃ *Commands:* \n` +
                   `┃ • \`.ireact on\` - Enable 🟢\n` +
                   `┃ • \`.ireact off\` - Disable 🔴\n` +
                   `┃\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *⚡ Powered by SACHIYA-MD 💫*`);
    }

    if (q.toLowerCase() === 'on') {
      iReactStatus = true;
      await saveAutoReactSettings('ireact', true);
      return reply("✅ *Inbox Auto-React has been enabled successfully!*");
    } else if (q.toLowerCase() === 'off') {
      iReactStatus = false;
      await saveAutoReactSettings('ireact', false);
      return reply("❌ *Inbox Auto-React has been disabled successfully!*");
    } else {
      return reply("⚠️ *Please use `.ireact on` or `.ireact off`*");
    }
  }
);

// 2. Command for Group AutoReact (.greact on / .greact off)
cmd(
  {
    pattern: "greact",
    desc: "Enable or Disable Auto-React for Groups",
    category: "owner",
    react: "👥",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply, senderNumber, sender, isGroup }) => {
    const ownerConfig = String(config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
    const cleanSender = String(senderNumber || sender || '').replace(/[^0-9]/g, '');
    const botNumber = String(sachiya.user?.id || '').split('@')[0].replace(/[^0-9]/g, '');

    const isTrueOwner = mek.key.fromMe || cleanSender.includes(ownerConfig) || ownerConfig.includes(cleanSender) || cleanSender === botNumber;

    if (!isTrueOwner) {
      return reply("❌ *This command is only for the Owner!*");
    }

    if (!q) {
      const statusText = gReactStatus ? "Enabled ✅" : "Disabled ❌";
      return reply(`╭━━━〔 *✨ SACHIYA-MD GREACT ✨* 〕━━━\n` +
                   `┃\n` +
                   `┃ 👥 *Group AutoReact:* ${statusText}\n` +
                   `┃\n` +
                   `┃ *Commands:* \n` +
                   `┃ • \`.greact on\` - Enable 🟢\n` +
                   `┃ • \`.greact off\` - Disable 🔴\n` +
                   `┃\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *⚡ Powered by SACHIYA-MD 💫*`);
    }

    if (q.toLowerCase() === 'on') {
      gReactStatus = true;
      await saveAutoReactSettings('greact', true);
      return reply("✅ *Group Auto-React has been enabled successfully!*");
    } else if (q.toLowerCase() === 'off') {
      gReactStatus = false;
      await saveAutoReactSettings('greact', false);
      return reply("❌ *Group Auto-React has been disabled successfully!*");
    } else {
      return reply("⚠️ *Please use `.greact on` or `.greact off`*");
    }
  }
);

module.exports = { handleAutoReact };
