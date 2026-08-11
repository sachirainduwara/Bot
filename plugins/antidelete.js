const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');
const mongoose = require('mongoose');
const config = require('../config');

const messageStore = new Map();
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// --- MongoDB Schema for Antidelete Setting ---
const AntideleteSchema = new mongoose.Schema({
  _id: { type: String, required: true, default: 'sachiyamd_antidelete_status' },
  enabled: { type: Boolean, default: false }
});
const AntideleteModel = mongoose.models.Antidelete || mongoose.model('Antidelete', AntideleteSchema);

// Load setting from MongoDB safely
async function loadAntideleteConfig() {
    if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) {
        return { enabled: false };
    }
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(config.SESSION_ID);
        }
        let doc = await AntideleteModel.findOne({ _id: 'sachiyamd_antidelete_status' });
        if (!doc) {
            doc = await AntideleteModel.create({ _id: 'sachiyamd_antidelete_status', enabled: false });
        }
        return { enabled: doc.enabled };
    } catch (e) {
        return { enabled: false };
    }
}

// Save setting to MongoDB safely
async function saveAntideleteConfig(isEnabled) {
    if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
    try {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(config.SESSION_ID);
        }
        await AntideleteModel.findOneAndUpdate(
            { _id: 'sachiyamd_antidelete_status' },
            { enabled: isEnabled },
            { upsert: true, new: true }
        );
    } catch (e) {}
}

// Store incoming messages
async function storeMessage(sock, message) {
    try {
        const cfg = await loadAntideleteConfig();
        if (!cfg.enabled) return;
        if (!message.key?.id) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';
        const sender = message.key.participant || message.key.remoteJid;
        const remoteJid = message.key.remoteJid;

        if (message.message?.conversation) {
            content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            const stream = await downloadContentFromMessage(message.message.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            const stream = await downloadContentFromMessage(message.message.videoMessage, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.audioMessage) {
            mediaType = 'audio';
            const stream = await downloadContentFromMessage(message.message.audioMessage, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp3`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            const stream = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            remoteJid,
            timestamp: new Date().toISOString()
        });

    } catch (err) {
        console.error('storeMessage error:', err);
    }
}

// Handle message deletion (Antidelete)
async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const cfg = await loadAntideleteConfig();
        if (!cfg.enabled) return;

        const protocolMsg = revocationMessage.message?.protocolMessage;
        if (!protocolMsg || protocolMsg.type !== 0) return;

        const messageId = protocolMsg.key?.id;
        const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;
        const remoteJid = revocationMessage.key.remoteJid;

        if (deletedBy.includes(sock.user.id)) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const sender = original.sender;
        const senderName = sender.split('@')[0];
        const deleterName = deletedBy.split('@')[0];

        let isAdminDelete = false;
        let groupAdmins = [];
        if (remoteJid.endsWith('@g.us')) {
            try {
                const groupMetadata = await sock.groupMetadata(remoteJid);
                groupAdmins = groupMetadata.participants
                    .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                    .map(p => p.id);
                
                if (groupAdmins.includes(deletedBy) && sender !== deletedBy) {
                    isAdminDelete = true;
                }
            } catch (e) {}
        }

        const timeString = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Colombo',
            hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        const dateString = new Date().toLocaleDateString('en-GB', {
            timeZone: 'Asia/Colombo'
        });

        let text = `╭━━━〔 *🗑️ SACHIYA-MD ANTIDELETE* 〕━━━\n` +
                   `┃\n` +
                   `┃ 👤 *Sender:* @${senderName}\n`;

        if (isAdminDelete) {
            text += `┃ 🛡️ *Deleted By (Admin):* @${deleterName}\n`;
        }

        text += `┃ ⏰ *Time:* ${timeString}\n` +
                `┃ 📅 *Date:* ${dateString}\n` +
                `┃\n`;

        if (original.content) {
            text += `┣ *💬 Deleted Message:*\n` +
                    `┃ ${original.content}\n` +
                    `┃\n`;
        }

        text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`;

        let mentionsArray = [sender];
        if (isAdminDelete) mentionsArray.push(deletedBy);

        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            try {
                if (original.mediaType === 'image') {
                    await sock.sendMessage(remoteJid, { 
                        image: { url: original.mediaPath }, 
                        caption: text, 
                        mentions: mentionsArray 
                    });
                } else if (original.mediaType === 'video') {
                    await sock.sendMessage(remoteJid, { 
                        video: { url: original.mediaPath }, 
                        caption: text, 
                        mentions: mentionsArray 
                    });
                } else if (original.mediaType === 'audio') {
                    await sock.sendMessage(remoteJid, { text, mentions: mentionsArray });
                    await sock.sendMessage(remoteJid, { 
                        audio: { url: original.mediaPath }, 
                        mimetype: 'audio/mpeg', 
                        ptt: false 
                    });
                } else if (original.mediaType === 'sticker') {
                    await sock.sendMessage(remoteJid, { text, mentions: mentionsArray });
                    await sock.sendMessage(remoteJid, { 
                        sticker: { url: original.mediaPath } 
                    });
                }
            } catch (err) {
                console.error('Media send error:', err);
            }

            try { fs.unlinkSync(original.mediaPath); } catch {}
        } else {
            await sock.sendMessage(remoteJid, {
                text,
                mentions: mentionsArray
            });
        }

        messageStore.delete(messageId);

    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
}

// Command handler (.antidelete on/off)
const { commands } = require('../command');
commands.push({
    pattern: 'antidelete',
    alias: ['antidel'],
    desc: 'Enable or disable antidelete system',
    category: 'owner',
    react: '🛡️',
    function: async (sock, mek, m, { q, reply, isOwner, senderNumber, from }) => {
        const botNumber = sock.user.id.split(':')[0];
        const isSelfChat = from === sock.user.id || senderNumber === botNumber;

        if (!isOwner && !isSelfChat && !mek.key.fromMe) {
            return reply('⚠️ *මෙම විධානය භාවිතා කළ හැක්කේ බොට් හිමිකරුට (Owner) පමණි!*');
        }

        const cfg = await loadAntideleteConfig();
        if (!q) {
            return reply(
                `╭━━━〔 *✨ SACHIYA-MD ANTIDELETE ✨* 〕━━━\n` +
                `┃\n` +
                `┃ ⚙️ *Current Status:* ${cfg.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                `┃\n` +
                `┃ *Available Commands:*\n` +
                `┃ • \`.antidelete on\` - Enable Antidelete 🟢\n` +
                `┃ • \`.antidelete off\` - Disable Antidelete 🔴\n` +
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
            return reply('⚠️ *වැරදි විධානයකි! භාවිතය සඳහා .antidelete ලෙස යොදන්න.*');
        }

        await saveAntideleteConfig(newStatus);
        return reply(`✨ *Antidelete System successfully ${newStatus ? 'Enabled 🟢' : 'Disabled 🔴'}!*`);
    }
});

module.exports = {
    storeMessage,
    handleMessageRevocation
};
