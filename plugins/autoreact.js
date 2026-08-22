const mongoose = require('mongoose');

// MongoDB Schema for AutoReact settings
const AutoReactSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  ireact: { type: Boolean, default: true },
  greact: { type: Boolean, default: true }
});
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', AutoReactSchema);

let iReactStatus = true;
let gReactStatus = true;

const goodEmojis = ['🩷', '💛', '💙', '🩶', '❤️', '💚', '💜', '🤍', '🧡', '🩵', '🖤', '🤎'];
const badEmojis = ['🫃', '🫄', '🤰'];
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

setTimeout(() => {
  loadAutoReactSettings();
}, 3000);

// Background Handler for AutoReact (ireact and greact)
async function handleAutoReact(sachiya, mek) {
  try {
    if (!mek || !mek.message || mek.key.fromMe) return;
    if (mek.key.remoteJid === 'status@broadcast') return;

    const from = mek.key.remoteJid;
    const isGroup = from.endsWith('@g.us');

    if (isGroup && !gReactStatus) return;
    if (!isGroup && !iReactStatus) return;

    let body = '';
    const msgType = Object.keys(mek.message)[0];
    if (msgType === 'conversation') body = mek.message.conversation;
    else if (msgType === 'extendedTextMessage') body = mek.message.extendedTextMessage.text;
    else if (msgType === 'imageMessage') body = mek.message.imageMessage.caption;
    else if (msgType === 'videoMessage') body = mek.message.videoMessage.caption;

    if (!body) return;

    const lowerBody = body.toLowerCase();
    const words = lowerBody.split(/\s+/);
    let isBadMessage = badWords.some(word => words.includes(word) || lowerBody.includes(word));

    let selectedEmoji = isBadMessage ? badEmojis[Math.floor(Math.random() * badEmojis.length)] : goodEmojis[Math.floor(Math.random() * goodEmojis.length)];

    await sachiya.sendMessage(from, { react: { text: selectedEmoji, key: mek.key } }).catch(() => {});
  } catch (e) {}
}

module.exports = { handleAutoReact };
