/**
 * SACHIYA-MD - Interactive Dashboard Settings Plugin
 * Fully Fixed & Working Reply-Based Settings Control
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
async (sachiya, mek, m, { from, q, reply, isOwner, quoted }) => {
    try {
        if (!isOwner && !mek.key.fromMe) return reply('*❌ Owner Only!*');

        let data = await getDB();
        let inputQuery = q.trim();

        // Check if the user replied to a message (Dashboard interaction support)
        if (!inputQuery && quoted && quoted.text) {
            // If user typed something in their reply or if we need to parse the quoted message text
            // Here we check if the current message text itself is something like "4 on" or "2 off"
            inputQuery = m.text ? m.text.trim() : '';
        }

        // Clean up prefix if user typed it with prefix in reply
        if (inputQuery.startsWith(config.PREFIX || '.')) {
            inputQuery = inputQuery.slice((config.PREFIX || '.').length).trim();
        }

        // If command is triggered as .settings 4 on
        let args = inputQuery.split(' ');
        if (args[0].toLowerCase() === 'settings') {
            args.shift();
        }

        if (args.length >= 2) {
            const num = args[0];
            const state = args[1].toLowerCase();
            let updatedName = '';
            let updatedVal = '';

            if (num === '1') {
                if (state === 'public' || state === 'private') {
                    data.workMode = state.toUpperCase();
                    config.WORK_TYPE = state;
                    updatedName = 'Work Mode';
                    updatedVal = data.workMode;
                } else {
                    return reply('❌ Use: 1 public or 1 private');
                }
            } else if (num === '2') {
                data.autoRead = (state === 'on');
                updatedName = 'Auto Read';
                updatedVal = data.autoRead ? 'ON' : 'OFF';
            } else if (num === '3') {
                data.autoSeen = (state === 'on');
                updatedName = 'Auto Seen';
                updatedVal = data.autoSeen ? 'ON' : 'OFF';
            } else if (num === '4') {
                data.antiCall = (state === 'on');
                updatedName = 'Anti-Call';
                updatedVal = data.antiCall ? 'ON' : 'OFF';
            } else {
                return reply('❌ Invalid setting number! Use numbers 1 to 4.');
            }
            
            data.updatedAt = new Date();
            await data.save();
            await sachiya.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});
            return reply(`✅ *${updatedName}* successfully updated to: *${updatedVal}* 🟢`);
        }

        // Dashboard Menu Generation
        const menu = `*⚡ SACHIYA-MD PREMIUM DASHBOARD ⚡*

*— 「 BASIC CONFIGS 」 —*
01. 🔒 *Work Mode:* ⌈ ${data.workMode} ⌋ (Reply "1 public/private")
02. ✉️ *Auto Read:* ⌈ ${data.autoRead ? '✅ ON' : '❌ OFF'} ⌋ (Reply "2 on/off")
03. 👁️ *Auto Seen:* ⌈ ${data.autoSeen ? '✅ ON' : '❌ OFF'} ⌋ (Reply "3 on/off")
04. 📞 *Anti-Call:* ⌈ ${data.antiCall ? '✅ ON' : '❌ OFF'} ⌋ (Reply "4 on/off")

*💡 EDIT SETTINGS:*
Reply with number + value.
Ex: Reply *2 on* or *1 private*`;

        const imageUrl = "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";

        await sachiya.sendMessage(from, { react: { text: '⚙️', key: mek.key } }).catch(() => {});
        return await sachiya.sendMessage(from, {
            image: { url: imageUrl },
            caption: menu
        }, { quoted: mek });

    } catch (e) {
        console.error('Error in settings dashboard:', e);
        return reply('*❌ Error loading settings dashboard!*');
    }
});

// Helper function for other plugins
async function getSettings() {
    return await getDB();
}

module.exports = { getSettings };
