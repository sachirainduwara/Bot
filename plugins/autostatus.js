const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');
const mongoose = require('mongoose');
const config = require('../config');

// 1. MongoDB Schema for Auto Status Settings
const autoStatusSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, default: 'autostatus_settings' },
    status: { type: String, default: 'false' }
});

const AutoStatus = mongoose.models.AutoStatus_SACHIYAMD || mongoose.model('AutoStatus_SACHIYAMD', autoStatusSchema);

module.exports = {
    name: 'autostatus',
    alias: ['autoreadstatus', 'astatus'],
    desc: 'Manage Auto Status Read and Like feature',
    category: 'owner',
    
    // Command Handler for On/Off UI Menu
    async execute(message, client, match, extra) {
        try {
            // Check Owner Number Permission (94760579211)
            const ownerNum = config.OWNER_NUM || "94760579211";
            const senderNumber = message.sender ? message.sender.replace(/[^0-9]/g, '') : '';
            
            if (senderNumber !== ownerNum) {
                if (message.react) await message.react('❌');
                return await message.reply("❌ **This command is only for the Owner!**");
            }

            const args = match ? match.trim().toLowerCase() : '';
            let setting = await AutoStatus.findOne({ id: 'autostatus_settings' });
            
            if (!setting) {
                setting = new AutoStatus({ id: 'autostatus_settings', status: 'false' });
                await setting.save();
            }

            if (args === 'on') {
                setting.status = 'true';
                await setting.save();
                if (message.react) await message.react('🟢');
                return await message.reply("✨ **Auto Status System Successfully Enabled 🟢 !**\n\n_Statuses will now be automatically viewed and liked._");
            } 
            else if (args === 'off') {
                setting.status = 'false';
                await setting.save();
                if (message.react) await message.react('🔴');
                return await message.reply("🔴 **Auto Status System Successfully Disabled ❌ !**");
            }

            // Beautiful UI Menu Display
            if (message.react) await message.react('⚙️');
            const currentStatusText = setting.status === 'true' ? "Enabled 🟢" : "Disabled ❌";
            
            const uiText = `
╭━━━〔 ✨ **SACHIYA-MD** 
┃ **AUTO STATUS SYSTEM** ✨ 〕━━━
┃
┃ ⚙️ **Current Status:** ${currentStatusText}
┃ 💚 **Mode:** Auto Read & Like (No Forward)
┃
┃ **Available Commands:**
┃ • \`.autostatus on\` - Enable Auto Status 🟢
┃ • \`.autostatus off\` - Disable Auto Status 🔴
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ **Powered by SACHIYA-MD 💫**
            `.trim();

            return await message.reply(uiText);

        } catch (error) {
            console.error("Plugin Error [autostatus]:", error);
            return await message.reply("❌ An error occurred while processing the command!");
        }
    },

    // Background Listener for Status Seen & Like (Heart React) - No Inbox Forwarding
    async onCall(conn, mek) {
        try {
            // Check MongoDB status state
            let setting = await AutoStatus.findOne({ id: 'autostatus_settings' });
            if (!setting || setting.status !== 'true') return;

            if (mek && mek.key && mek.key.remoteJid === 'status@broadcast') {
                const participant = mek.key.participant || mek.participant;

                // 1. Automatically read/seen the status
                try {
                    await conn.readMessages([mek.key]);
                } catch (e) {
                    console.error("❌ Failed to mark status as seen:", e);
                }

                // 2. Automatically give a Like (💚 Heart React) to the status without forwarding to inbox
                if (participant) {
                    try {
                        await conn.sendMessage('status@broadcast', {
                            react: {
                                text: '💚',
                                key: mek.key,
                            }
                        }, { statusJidList: [participant] });
                    } catch (e) {
                        console.error("❌ Failed to react to status:", e);
                    }
                }
            }
        } catch (e) {
            // Silent error catch to prevent bot crashes
            console.error("Auto Status Background Error:", e);
        }
    }
};
