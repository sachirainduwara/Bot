/**
 * SACHIYA-MD - A WhatsApp Bot
 * Autoread Plugin - Styled like Antidelete
 */

const { cmd } = require('../command');
const mongoose = require('mongoose');
const config = require('../config');

// MongoDB Connection String
const MONGO_URI = config.SESSION_ID || "mongodb+srv://sachirainduwara02_db_user:Sachi2010@cluster0.skykj4x.mongodb.net/?appName=Cluster0";

// Mongoose Schema for Autoread settings
const AutoReadSchema = new mongoose.Schema({
    _id: { type: String, required: true, default: 'autoread_config' },
    enabled: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});

const AutoReadModel = mongoose.models.AutoRead || mongoose.model('AutoRead', AutoReadSchema);

async function connectDB() {
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGO_URI);
        }
    } catch (error) {
        console.error('❌ MongoDB Connection Error in Autoread:', error);
    }
}

async function initConfig() {
    try {
        await connectDB();
        let configData = await AutoReadModel.findOne({ _id: 'autoread_config' });
        if (!configData) {
            configData = await AutoReadModel.create({ _id: 'autoread_config', enabled: false });
        }
        return configData;
    } catch (error) {
        console.error('Error reading autoread config from MongoDB:', error);
        return { enabled: false };
    }
}

// Registering the command with Antidelete-styled layout
cmd({
    pattern: "autoread",
    desc: "Enable or disable automatic reading of messages",
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
        let configData = await AutoReadModel.findOne({ _id: 'autoread_config' });
        if (!configData) {
            configData = new AutoReadModel({ _id: 'autoread_config', enabled: false });
        }

        const action = q ? q.trim().toLowerCase() : '';

        if (action === 'on' || action === 'enable') {
            configData.enabled = true;
            configData.updatedAt = new Date();
            await configData.save();

            await sachiya.sendMessage(from, { react: { text: '🟢', key: mek.key } }).catch(() => {});
            return reply(`✨ Autoread System successfully Enabled 🟢!`);

        } else if (action === 'off' || action === 'disable') {
            configData.enabled = false;
            configData.updatedAt = new Date();
            await configData.save();

            await sachiya.sendMessage(from, { react: { text: '🔴', key: mek.key } }).catch(() => {});
            return reply(`✨ Autoread System successfully Disabled 🔴!`);

        } else if (action === '') {
            // .autoread විතරක් ගැහුවම මෙනු එක පෙන්වීම
            const currentStatus = configData.enabled ? '🟢 Enabled' : '🔴 Disabled';
            
            const menuText = `──────〔 ✨ SACHIYA-MD AUTOREAD ✨ 〕──────\n` +
                             `│\n` +
                             `│  ⚙️ Current Status: ${currentStatus}\n` +
                             `│\n` +
                             `│  Available Commands:\n` +
                             `│  • .autoread on - Enable Autoread 🟢\n` +
                             `│  • .autoread off - Disable Autoread 🔴\n` +
                             `│\n` +
                             `└───────────────────────────────────\n\n` +
                             `> *⚡ Powered by SACHIYA-MD 💫*`;

            await sachiya.sendMessage(from, { react: { text: '👁️‍🗨️', key: mek.key } }).catch(() => {});
            return reply(menuText);

        } else {
            await sachiya.sendMessage(from, { react: { text: '⚠️', key: mek.key } }).catch(() => {});
            return reply('❌ Invalid option! Use `.autoread on` or `.autoread off`');
        }

    } catch (error) {
        console.error('Error in autoread command:', error);
        await sachiya.sendMessage(from, { react: { text: '🔥', key: mek.key } }).catch(() => {});
        return reply('*❌ Error processing command!*');
    }
});

// Function to check if autoread is enabled
async function isAutoreadEnabled() {
    try {
        const configData = await initConfig();
        return configData.enabled;
    } catch (error) {
        console.error('Error checking autoread status:', error);
        return false;
    }
}

// Function to handle automatic reading
async function handleAutoread(sachiya, mek) {
    try {
        const enabled = await isAutoreadEnabled();
        if (enabled && !mek.key.fromMe) {
            const key = { 
                remoteJid: mek.key.remoteJid, 
                id: mek.key.id, 
                participant: mek.key.participant 
            };
            await sachiya.readMessages([key]);
            return true;
        }
    } catch (error) {
        console.error('Autoread Execution Error:', error);
    }
    return false;
}

module.exports = {
    handleAutoread
};
