/**
 * SACHIYA-MD - A WhatsApp Bot
 * Autostatus & Like Plugin - Fixed Handler
 */

const { cmd } = require('../command');
const mongoose = require('mongoose');
const config = require('../config');

// MongoDB Connection String
const MONGO_URI = config.SESSION_ID || "mongodb+srv://sachirainduwara02_db_user:Sachi2010@cluster0.skykj4x.mongodb.net/?appName=Cluster0";

// Mongoose Schema for Autostatus settings
const AutoStatusSchema = new mongoose.Schema({
    _id: { type: String, required: true, default: 'autostatus_config' },
    enabled: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});

const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', AutoStatusSchema);

async function connectDB() {
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGO_URI);
        }
    } catch (error) {
        console.error('❌ MongoDB Connection Error in Autostatus:', error);
    }
}

async function initConfig() {
    try {
        await connectDB();
        let configData = await AutoStatusModel.findOne({ _id: 'autostatus_config' });
        if (!configData) {
            configData = await AutoStatusModel.create({ _id: 'autostatus_config', enabled: false });
        }
        return configData;
    } catch (error) {
        console.error('Error reading autostatus config from MongoDB:', error);
        return { enabled: false };
    }
}

// Registering the command with proper owner check and styled layout
cmd({
    pattern: "autostatus",
    alias: ["statusview", "autoview"],
    desc: "Enable or disable automatic status viewing and liking",
    category: "owner",
    filename: __filename
},
async (sachiya, mek, m, { from, q, reply, isOwner }) => {
    try {
        if (!isOwner && !mek.key.fromMe) {
            await sachiya.sendMessage(from, { react: { text: '❌', key: mek.key } }).catch(() => {});
            return reply('*❌ This command is only available for the owner!*');
        }

        await connectDB();
        let configData = await AutoStatusModel.findOne({ _id: 'autostatus_config' });
        if (!configData) {
            configData = new AutoStatusModel({ _id: 'autostatus_config', enabled: false });
        }

        const action = q ? q.trim().toLowerCase() : '';

        if (action === 'on' || action === 'enable') {
            configData.enabled = true;
            configData.updatedAt = new Date();
            await configData.save();

            await sachiya.sendMessage(from, { react: { text: '🟢', key: mek.key } }).catch(() => {});
            return reply(`✨ Autostatus System successfully Enabled 🟢!`);

        } else if (action === 'off' || action === 'disable') {
            configData.enabled = false;
            configData.updatedAt = new Date();
            await configData.save();

            await sachiya.sendMessage(from, { react: { text: '🔴', key: mek.key } }).catch(() => {});
            return reply(`✨ Autostatus System successfully Disabled 🔴!`);

        } else if (action === '') {
            const currentStatus = configData.enabled ? '🟢 Enabled' : '🔴 Disabled';
            
            const menuText = `──────〔 ✨ SACHIYA-MD AUTOSTATUS ✨ 〕──────\n` +
                             `│\n` +
                             `│  ⚙️ Current Status: ${currentStatus}\n` +
                             `│\n` +
                             `│  Available Commands:\n` +
                             `│  • .autostatus on - Enable Autostatus 🟢\n` +
                             `│  • .autostatus off - Disable Autostatus 🔴\n` +
                             `│\n` +
                             `└───────────────────────────────────\n\n` +
                             `> *⚡ Powered by SACHIYA-MD 💫*`;

            await sachiya.sendMessage(from, { react: { text: '🔄', key: mek.key } }).catch(() => {});
            return reply(menuText);

        } else {
            await sachiya.sendMessage(from, { react: { text: '⚠️', key: mek.key } }).catch(() => {});
            return reply('❌ Invalid option! Use `.autostatus on` or `.autostatus off`');
        }

    } catch (error) {
        console.log('Error in autostatus command:', error);
        await sachiya.sendMessage(from, { react: { text: '🔥', key: mek.key } }).catch(() => {});
        return reply('*❌ Error processing command!*');
    }
});

// Function to check if autostatus is enabled
async function isAutostatusEnabled() {
    try {
        const configData = await initConfig();
        return configData.enabled;
    } catch (error) {
        console.log('Error checking autostatus status:', error);
        return false;
    }
}

// Background Handler for Status Viewing & Green Heart Liking (Fixed for all bases)
cmd({ on: "messages.upsert" }, async (sachiya, mek, m) => {
    try {
        const enabled = await isAutostatusEnabled();
        if (!enabled) return;

        // මැසේජ් එක ස්ටේටස් එකක් ද (status@broadcast) කියලා පරීක්ෂා කිරීම
        if (mek.key && mek.key.remoteJid === 'status@broadcast') {
            let participant = mek.key.participant || mek.participant;
            if (!participant && m && m.participant) participant = m.participant;

            // 1. Status එක View කිරීම (Seen දැමීම)
            await sachiya.readMessages([mek.key]);

            // 2. Green Heart (Like) එක යැවීම
            if (participant) {
                await sachiya.sendMessage(
                    'status@broadcast',
                    {
                        react: {
                            text: '💚',
                            key: mek.key
                        }
                    },
                    { statusJidList: [participant] }
                );
            }
        }
    } catch (error) {
        console.log('Autostatus Handler Error:', error);
    }
});

module.exports = {
    handleAutostatus: async () => {}
};
