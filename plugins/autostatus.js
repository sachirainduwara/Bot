const mongoose = require('mongoose');

// 1. MongoDB Schema (Directly inside the plugin for smooth operation)
const autoStatusSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true, default: 'autostatus_settings' },
    status: { type: String, default: 'false' }
});

const AutoStatus = mongoose.model('AutoStatus_SACHIYAMD', autoStatusSchema);

module.exports = {
    name: 'autostatus',
    alias: ['autoreadstatus', 'astatus'],
    desc: 'Manage Auto Status Read and React feature',
    category: 'owner',
    
    // --- PART 1: The Command Handler (UI & On/Off Toggle) ---
    async execute(message, client, match, extra) {
        try {
            // Check Owner Permission (94760579211)
            const senderNumber = message.sender ? message.sender.split('@')[0] : '';
            if (senderNumber !== "94760579211") {
                // React with error emoji to message
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
                return await message.reply("✨ **Auto Status System Successfully Enabled 🟢 !**");
            } 
            else if (args === 'off') {
                setting.status = 'false';
                await setting.save();
                if (message.react) await message.react('🔴');
                return await message.reply("🔴 **Auto Status System Successfully Disabled ❌ !**");
            }

            // UI Display Menu with Reactions
            if (message.react) await message.react('⚙️');
            
            const currentStatusText = setting.status === 'true' ? "Enabled 🟢" : "Disabled ❌";
            
            const uiText = `
╭━━━〔 ✨ **SACHIYA-MD** 
┃ **AUTO STATUS SYSTEM** ✨ 〕━━━
┃
┃ ⚙️ **Current Status:** ${currentStatusText}
┃
┃ **Available Commands:**
┃ • \`.autostatus on\` - Enable Auto Status 🟢
┃ • \`.autostatus off\` - Disable Auto Status 🔴
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ **Powered by SACHIYA-MD 💫**
            `.trim();

            await message.reply(uiText);

        } catch (error) {
            console.error("Plugin Error [autostatus]:", error);
            await message.reply("❌ An error occurred while processing the command!");
        }
    },

    // --- PART 2: The Background Event Listener (Auto Read & React Status) ---
    async onMessage(sock, m) {
        try {
            // Check if settings are enabled in MongoDB
            let setting = await AutoStatus.findOne({ id: 'autostatus_settings' });
            if (!setting || setting.status !== 'true') return;

            // Check if the incoming message is a status broadcast
            if (m.key && m.key.remoteJid === 'status@broadcast') {
                const participant = m.key.participant || m.participant;
                
                // 1. Automatically read the status
                await sock.readMessages([m.key]);

                // 2. Automatically react to the status with an emoji (e.g., 💚)
                await sock.sendMessage('status@broadcast', {
                    react: {
                        text: '💚',
                        key: m.key
                    }
                }, { statusJidList: [participant] });
            }
        } catch (error) {
            // Silent catch to prevent bot crashes on background tasks
            console.error("Auto Status Background Error: ", error);
        }
    }
};
