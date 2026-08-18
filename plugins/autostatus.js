const { cmd } = require('../command');
const mongoose = require('mongoose');
const config = require('../config');

// --- MongoDB Schema for Auto Status Read Setting ---
const AutoStatusSchema = new mongoose.Schema({
  _id: { type: String, required: true, default: 'sachiyamd_autostatus_status' },
  enabled: { type: Boolean, default: true }
});
const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', AutoStatusSchema);

// Load setting from MongoDB safely
async function loadAutoStatusConfig() {
    if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) {
        return { enabled: true };
    }
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(config.SESSION_ID);
        }
        let doc = await AutoStatusModel.findOne({ _id: 'sachiyamd_autostatus_status' });
        if (!doc) {
            doc = await AutoStatusModel.create({ _id: 'sachiyamd_autostatus_status', enabled: true });
        }
        return { enabled: doc.enabled };
    } catch (e) {
        return { enabled: true };
    }
}

// Save setting to MongoDB safely
async function saveAutoStatusConfig(isEnabled) {
    if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(config.SESSION_ID);
        }
        await AutoStatusModel.findOneAndUpdate(
            { _id: 'sachiyamd_autostatus_status' },
            { enabled: isEnabled },
            { upsert: true, new: true }
        );
    } catch (e) {}
}

// 1. Auto Status Read ලොජික් එක (Status එකක් වැටුණු සැනින් කිසිදු ඉමෝජියක් හෝ රියැක්ට් එකක් නොමැතිව නිහඬව Read කරයි)
cmd({
    on: "status"
}, async (sock, mek, m) => {
    try {
        const cfg = await loadAutoStatusConfig();
        if (!cfg.enabled) return;

        if (mek.key && mek.key.remoteJid === "status@broadcast") {
            await sock.readMessages([{
                remoteJid: "status@broadcast",
                id: mek.key.id,
                participant: mek.key.participant || m.participant || m.sender
            }]);
        }
    } catch (e) {
        // Silently catch errors to prevent console spam
    }
});

// 2. Command handler (.autostatus on/off)
const { commands } = require('../command');
commands.push({
    pattern: 'autostatus',
    alias: ['statusread', 'autoreadstatus'],
    desc: 'Enable or disable auto status read system',
    category: 'owner',
    react: '👁️',
    function: async (sock, mek, m, { q, reply, isOwner, senderNumber, from }) => {
        try {
            const botNumber = sock.user.id.split(':')[0];
            const isSelfChat = from === sock.user.id || senderNumber === botNumber;

            if (!isOwner && !isSelfChat && !mek.key.fromMe) {
                return reply('⚠️ *මෙම විධානය භාවිතා කළ හැක්කේ බොට් හිමිකරුට (Owner) පමණි!*');
            }

            const cfg = await loadAutoStatusConfig();
            if (!q) {
                return reply(
                    `╭━━━〔 *✨ SACHIYA-MD AUTO STATUS ✨* 〕━━━\n` +
                    `┃\n` +
                    `┃ ⚙️ *Current Status:* ${cfg.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                    `┃\n` +
                    `┃ *Available Commands:*\n` +
                    `┃ • \`.autostatus on\` - Enable Auto Status Read 🟢\n` +
                    `┃ • \`.autostatus off\` - Disable Auto Status Read 🔴\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`
                );
            }

            let newStatus = false;
            if (q.toLowerCase() === 'on') {
                newStatus = true;
            } else if (q.toLowerCase() === 'off') {
                newStatus = false;
            } else {
                return reply('⚠️ *වැරදි විධානයකි! භාවිතය සඳහා .autostatus on හෝ off ලෙස යොදන්න.*');
            }

            await saveAutoStatusConfig(newStatus);
            return reply(`✨ *Auto Status Read System successfully ${newStatus ? 'Enabled 🟢' : 'Disabled 🔴'}!*`);

        } catch (err) {
            return reply('❌ *An error occurred while executing the command!*');
        }
    }
});

module.exports = {};
