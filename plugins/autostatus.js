/**
 * SACHIYA-MD - AutoStatus & Native Like Plugin
 * MongoDB Integrated with Beautiful UI & Emojis
 */

const mongoose = require('mongoose');
const isOwnerOrSudo = require('../lib/isOwner');

const channelInfo = {
    contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363161513685998@newsletter',
            newsletterName: 'SACHIYA-MD',
            serverMessageId: -1
        }
    }
};

// MongoDB Schema for AutoStatus Configuration
const AutoStatusSchema = new mongoose.Schema({
    _id: { type: String, required: true, default: 'autostatus_config' },
    enabled: { type: Boolean, default: false },
    reactOn: { type: Boolean, default: false }
});

const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', AutoStatusSchema);

// Helper function to get or initialize config from MongoDB
async function getConfig() {
    try {
        let configData = await AutoStatusModel.findOne({ _id: 'autostatus_config' });
        if (!configData) {
            configData = await AutoStatusModel.create({ _id: 'autostatus_config', enabled: false, reactOn: false });
        }
        return configData;
    } catch (error) {
        console.error('Error reading auto status config from MongoDB:', error);
        return { enabled: false, reactOn: false, save: async () => {} };
    }
}

async function autoStatusCommand(sock, chatId, msg, args) {
    try {
        const senderId = msg.key.participant || msg.key.remoteJid;
        const isOwner = await isOwnerOrSudo(senderId, sock, chatId);
        
        if (!msg.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, { 
                text: '❌ This command can only be used by the owner!',
                ...channelInfo
            });
            return;
        }

        // Read current config from MongoDB
        let config = await getConfig();

        // If no arguments, show current status with beautiful UI & Emojis
        if (!args || args.length === 0) {
            const status = config.enabled ? '🟢 Enabled' : '🔴 Disabled';
            const reactStatus = config.reactOn ? '🟢 Enabled' : '🔴 Disabled';
            
            const menuText = `╭─── 〔 ✨ SACHIYA-MD AUTOSTATUS 💫 〕 ───╮\n` +
                             `│\n` +
                             `│  📱 *Auto Status View:* ${status}\n` +
                             `│  💫 *Status Reactions:* ${reactStatus}\n` +
                             `│\n` +
                             `│  *Commands:*\n` +
                             `│  • \`.autostatus on\` - Enable auto status view 🟢\n` +
                             `│  • \`.autostatus off\` - Disable auto status view 🔴\n` +
                             `│  • \`.autostatus react on\` - Enable reactions 💫\n` +
                             `│  • \`.autostatus react off\` - Disable reactions ❌\n` +
                             `│\n` +
                             `╰──────────────────────────────────────────╯\n\n` +
                             `> *⚡ Powered by SACHIYA-MD 💫*`;

            await sock.sendMessage(chatId, { 
                text: menuText,
                ...channelInfo
            });
            return;
        }

        // Handle on/off commands
        const command = args[0].toLowerCase();
        
        if (command === 'on') {
            config.enabled = true;
            await config.save();
            await sock.sendMessage(chatId, { 
                text: '✅ *Auto status view has been enabled 🟢!*\nBot will now automatically view all contact statuses.',
                ...channelInfo
            });
        } else if (command === 'off') {
            config.enabled = false;
            await config.save();
            await sock.sendMessage(chatId, { 
                text: '❌ *Auto status view has been disabled 🔴!*\nBot will no longer automatically view statuses.',
                ...channelInfo
            });
        } else if (command === 'react') {
            if (!args[1]) {
                await sock.sendMessage(chatId, { 
                    text: '❌ Please specify on/off for reactions!\nUse: `.autostatus react on` or `.autostatus react off`',
                    ...channelInfo
                });
                return;
            }
            
            const reactCommand = args[1].toLowerCase();
            if (reactCommand === 'on') {
                config.reactOn = true;
                await config.save();
                await sock.sendMessage(chatId, { 
                    text: '💫 *Status reactions have been enabled 🟢!*\nBot will now react to status updates.',
                    ...channelInfo
                });
            } else if (reactCommand === 'off') {
                config.reactOn = false;
                await config.save();
                await sock.sendMessage(chatId, { 
                    text: '❌ *Status reactions have been disabled 🔴!*\nBot will no longer react to status updates.',
                    ...channelInfo
                });
            } else {
                await sock.sendMessage(chatId, { 
                    text: '❌ Invalid reaction command! Use: `.autostatus react on` or `.autostatus react off`',
                    ...channelInfo
                });
            }
        } else {
            await sock.sendMessage(chatId, { 
                text: '❌ Invalid command! Use:\n• `.autostatus on/off`\n• `.autostatus react on/off`',
                ...channelInfo
            });
        }

    } catch (error) {
        console.error('Error in autostatus command:', error);
        await sock.sendMessage(chatId, { 
            text: '❌ Error occurred while managing auto status!\n' + error.message,
            ...channelInfo
        });
    }
}

// Function to check if auto status is enabled (MongoDB asynchronous check)
async function isAutoStatusEnabled() {
    try {
        const config = await getConfig();
        return config.enabled;
    } catch (error) {
        console.error('Error checking auto status config:', error);
        return false;
    }
}

// Function to check if status reactions are enabled (MongoDB asynchronous check)
async function isStatusReactionEnabled() {
    try {
        const config = await getConfig();
        return config.reactOn;
    } catch (error) {
        console.error('Error checking status reaction config:', error);
        return false;
    }
}

// Function to react to status using proper method
async function reactToStatus(sock, statusKey) {
    try {
        const reactEnabled = await isStatusReactionEnabled();
        if (!reactEnabled) {
            return;
        }

        // Use the proper relayMessage method for status reactions
        await sock.relayMessage(
            'status@broadcast',
            {
                reactionMessage: {
                    key: {
                        remoteJid: 'status@broadcast',
                        id: statusKey.id,
                        participant: statusKey.participant || statusKey.remoteJid,
                        fromMe: false
                    },
                    text: '💚'
                }
            },
            {
                messageId: statusKey.id,
                statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid]
            }
        );
    } catch (error) {
        console.error('❌ Error reacting to status:', error.message);
    }
}

// Function to handle status updates
async function handleStatusUpdate(sock, status) {
    try {
        const statusEnabled = await isAutoStatusEnabled();
        if (!statusEnabled) {
            return;
        }

        // Add delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Handle status from messages.upsert
        if (status.messages && status.messages.length > 0) {
            const msg = status.messages[0];
            if (msg.key && msg.key.remoteJid === 'status@broadcast') {
                try {
                    await sock.readMessages([msg.key]);
                    await reactToStatus(sock, msg.key);
                } catch (err) {
                    if (err.message?.includes('rate-overlimit')) {
                        console.log('⚠️ Rate limit hit, waiting before retrying...');
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        await sock.readMessages([msg.key]);
                    } else {
                        throw err;
                    }
                }
                return;
            }
        }

        // Handle direct status updates
        if (status.key && status.key.remoteJid === 'status@broadcast') {
            try {
                await sock.readMessages([status.key]);
                await reactToStatus(sock, status.key);
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Rate limit hit, waiting before retrying دارو...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

        // Handle status in reactions
        if (status.reaction && status.reaction.key.remoteJid === 'status@broadcast') {
            try {
                await sock.readMessages([status.reaction.key]);
                await reactToStatus(sock, status.reaction.key);
            } catch (err) {
                if (err.message?.includes('rate-overlimit')) {
                    console.log('⚠️ Rate limit hit, waiting before retrying...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    await sock.readMessages([status.reaction.key]);
                } else {
                    throw err;
                }
            }
            return;
        }

    } catch (error) {
        console.error('❌ Error in auto status view:', error.message);
    }
}

module.exports = {
    autoStatusCommand,
    handleStatusUpdate
};
