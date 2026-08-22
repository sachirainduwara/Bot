/**
 * SACHIYA-MD - AutoStatus & Native Like Plugin (Final Fix)
 */

const { cmd } = require('../command');
const mongoose = require('mongoose');
const config = require('../config');

// MongoDB Connection
const MONGO_URI = config.SESSION_ID || "mongodb+srv://sachirainduwara02_db_user:Sachi2010@cluster0.skykj4x.mongodb.net/?appName=Cluster0";

const AutoStatusSchema = new mongoose.Schema({
    _id: { type: String, required: true, default: 'autostatus_config' },
    enabled: { type: Boolean, default: false }
});

const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', AutoStatusSchema);

// Setting Command
cmd({
    pattern: "autostatus",
    desc: "Enable/Disable Auto Status View & Like",
    category: "owner",
    filename: __filename
}, async (sachiya, mek, m, { from, q, reply, isOwner }) => {
    if (!isOwner && !mek.key.fromMe) return;

    let configData = await AutoStatusModel.findOne({ _id: 'autostatus_config' }) || new AutoStatusModel({ _id: 'autostatus_config' });
    
    if (q === 'on') {
        configData.enabled = true;
        await configData.save();
        return reply("✨ *Auto Status View & Like Enabled 🟢*");
    } else if (q === 'off') {
        configData.enabled = false;
        await configData.save();
        return reply("✨ *Auto Status View & Like Disabled 🔴*");
    }
    
    reply(`*Auto Status Status:* ${configData.enabled ? '🟢 Enabled' : '🔴 Disabled'}\nUse .autostatus on/off`);
});

// Final Background Handler - Fixed
cmd({ on: "status" }, async (sachiya, mek, m) => {
    try {
        const configData = await AutoStatusModel.findOne({ _id: 'autostatus_config' });
        if (!configData || !configData.enabled) return;

        // 1. Seen දැමීම
        await sachiya.readMessages([mek.key]);

        // 2. අනිවාර්යයෙන් වැඩ කරන Like ක්‍රමය
        const participant = mek.key.participant || m.participant || mek.participant;
        
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
    } catch (e) {
        console.log("Status Error:", e);
    }
});
