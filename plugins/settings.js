/**
 * SACHIYA-MD - Interactive Dashboard Settings
 * SACHIYA-MD Premium Configuration Panel
 */

const { cmd } = require('../command');
const mongoose = require('mongoose');
const config = require('../config');

// Dashboard Settings Schema
const SettingsSchema = new mongoose.Schema({
    _id: { type: String, required: true, default: 'sachiya_settings' },
    workMode: { type: String, default: 'PUBLIC' },
    autoRead: { type: Boolean, default: false },
    autoSeen: { type: Boolean, default: true },
    antiCall: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});

const SettingsModel = mongoose.models.SachiyaSettings || mongoose.model('SachiyaSettings', SettingsSchema);

async function getDB() {
    let data = await SettingsModel.findOne({ _id: 'sachiya_settings' });
    if (!data) data = await SettingsModel.create({ _id: 'sachiya_settings' });
    return data;
}

cmd({
    pattern: "settings",
    alias: ["setting", "dashboard"],
    desc: "SACHIYA-MD Premium Dashboard",
    category: "owner",
    filename: __filename
},
async (sachiya, mek, m, { from, q, reply, isOwner }) => {
    try {
        if (!isOwner && !mek.key.fromMe) return reply('*❌ Owner Only!*');

        let data = await getDB();
        const args = q.trim().split(' ');

        // Settings Update Logic (Reply with number + on/off)
        if (args.length >= 2) {
            const num = args[0];
            const state = args[1].toLowerCase();

            if (num === '1') { // Work Mode
                data.workMode = state.toUpperCase();
            } else if (num === '2') { // Auto Read
                data.autoRead = state === 'on';
            } else if (num === '3') { // Auto Seen
                data.autoSeen = state === 'on';
            } else if (num === '4') { // Anti Call
                data.antiCall = state === 'on';
            }
            
            await data.save();
            await sachiya.sendMessage(from, { react: { text: '✅', key: mek.key } });
            return reply(`✅ *Setting updated successfully!*`);
        }

        // Dashboard Menu
        const menu = `*⚡ SACHIYA-MD PREMIUM DASHBOARD ⚡*

*— 「 BASIC CONFIGS 」 —*
01. 🔒 *Work Mode:* ⌈ ${data.workMode} ⌋ (Reply "1 public/private")
02. ✉️ *Auto Read:* ⌈ ${data.autoRead ? '✅ ON' : '❌ OFF'} ⌋ (Reply "2 on/off")
03. 👁️ *Auto Seen:* ⌈ ${data.autoSeen ? '✅ ON' : '❌ OFF'} ⌋ (Reply "3 on/off")
04. 📞 *Anti-Call:* ⌈ ${data.antiCall ? '✅ ON' : '❌ OFF'} ⌋ (Reply "4 on/off")

*💡 EDIT SETTINGS:*
Reply with number + value.
Ex: Reply *2 on* or *1 private*`;

        return await sachiya.sendMessage(from, {
            image: { url: "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true" },
            caption: menu
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        reply('*❌ Error loading settings!*');
    }
});

// Helper for other plugins to check settings
async function getSettings() {
    return await getDB();
}

module.exports = { getSettings };
