/**
 * SACHIYA-MD - A WhatsApp Bot
 * Autoread Command - Automatically read all messages and save to MongoDB
 */

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

// Ensure connection to MongoDB
async function connectDB() {
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(MONGO_URI);
        }
    } catch (error) {
        console.error('❌ MongoDB Connection Error in Autoread:', error);
    }
}

// Initialize configuration from MongoDB
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

// Toggle autoread feature
async function autoreadCommand(sock, chatId, message) {
    try {
        const senderId = message.key.participant || message.key.remoteJid;
        const senderNumber = senderId.replace(/[^0-9]/g, '');
        const ownerNumber = (config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
        
        const isOwner = senderNumber === ownerNumber || message.key.fromMe;
        
        if (!message.key.fromMe && !isOwner) {
            await sock.sendMessage(chatId, {
                text: '❌ This command is only available for the owner!',
                contextInfo: {
                    forwardingScore: 1,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: '120363161513685998@newsletter',
                        newsletterName: 'SACHIYA-MD',
                        serverMessageId: -1
                    }
                }
            });
            return;
        }

        // Get command arguments safely
        const rawText = message.message?.conversation || 
                        message.message?.extendedTextMessage?.text || 
                        message.message?.imageMessage?.caption || '';
        
        const args = rawText.trim().split(/ +/).slice(1);
        
        await connectDB();
        let configData = await AutoReadModel.findOne({ _id: 'autoread_config' });
        if (!configData) {
            configData = new AutoReadModel({ _id: 'autoread_config', enabled: false });
        }
        
        // Toggle based on argument (.autoread on / off)
        if (args.length > 0) {
            const action = args[0].toLowerCase();
            if (action === 'on' || action === 'enable') {
                configData.enabled = true;
            } else if (action === 'off' || action === 'disable') {
                configData.enabled = false;
            } else {
                await sock.sendMessage(chatId, {
                    text: '❌ Invalid option! Use: .autoread on or .autoread off',
                    contextInfo: {
                        forwardingScore: 1,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: '120363161513685998@newsletter',
                            newsletterName: 'SACHIYA-MD',
                            serverMessageId: -1
                        }
                    }
                });
                return;
            }
        } else {
            configData.enabled = !configData.enabled;
        }
        
        configData.updatedAt = new Date();
        await configData.save();
        
        await sock.sendMessage(chatId, {
            text: `✅ Auto-read has been successfully ${configData.enabled ? 'ENABLED' : 'DISABLED'}! (Saved to MongoDB)`,
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'SACHIYA-MD',
                    serverMessageId: -1
                }
            }
        });
        
    } catch (error) {
        console.error('Error in autoread command:', error);
        await sock.sendMessage(chatId, {
            text: '❌ Error processing command!',
            contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: '120363161513685998@newsletter',
                    newsletterName: 'SACHIYA-MD',
                    serverMessageId: -1
                }
            }
        });
    }
}

// Function to check if autoread is enabled from database
async function isAutoreadEnabled() {
    try {
        const configData = await initConfig();
        return configData.enabled;
    } catch (error) {
        console.error('Error checking autoread status:', error);
        return false;
    }
}

// Function to handle autoread functionality directly for all incoming messages
async function handleAutoread(sock, message) {
    try {
        const enabled = await isAutoreadEnabled();
        if (enabled && !message.key.fromMe) {
            const key = { 
                remoteJid: message.key.remoteJid, 
                id: message.key.id, 
                participant: message.key.participant 
            };
            await sock.readMessages([key]);
            return true; 
        }
    } catch (error) {
        console.error('Autoread Execution Error:', error);
    }
    return false; 
}

module.exports = {
    autoreadCommand,
    isAutoreadEnabled,
    handleAutoread
};
