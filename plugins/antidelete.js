const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');
const mongoose = require('mongoose');
const config = require('../config');

// Temporary folder for media storage
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');
if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// In-memory message store for tracking deleted messages
const messageStore = new Map();

// MongoDB Schema for Antidelete settings
const AntideleteSchema = new mongoose.Schema({
  _id: { type: String, required: true, default: 'sachiyamd_antidelete_status' },
  enabled: { type: Boolean, default: false }
});
const AntideleteModel = mongoose.models.Antidelete || mongoose.model('Antidelete', AntideleteSchema);

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
    } catch (error) {
        return { enabled: false };
    }
}

// Function to store incoming messages
async function storeMessage(sock, message) {
    try {
        const configData = await loadAntideleteConfig();
        if (!configData.enabled) return;
        if (!message.key || !message.key.id) return;

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
        } else if (message.message?.imageMessage && message.message.imageMessage.mediaKey) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            try {
                const stream = await downloadContentFromMessage(message.message.imageMessage, 'image');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                await writeFile(mediaPath, buffer);
            } catch (e) {}
        } else if (message.message?.videoMessage && message.message.videoMessage.mediaKey) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            try {
                const stream = await downloadContentFromMessage(message.message.videoMessage, 'video');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                await writeFile(mediaPath, buffer);
            } catch (e) {}
        } else if (message.message?.audioMessage && message.message.audioMessage.mediaKey) {
            mediaType = 'audio';
            try {
                const stream = await downloadContentFromMessage(message.message.audioMessage, 'audio');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp3`);
                await writeFile(mediaPath, buffer);
            } catch (e) {}
        } else if (message.message?.stickerMessage && message.message.stickerMessage.mediaKey) {
            mediaType = 'sticker';
            try {
                const stream = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
                let buffer = Buffer.from([]);
                for await (const chunk of stream) { buffer = Buffer.concat([buffer, chunk]); }
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
                await writeFile(mediaPath, buffer);
            } catch (e) {}
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            remoteJid,
            timestamp: new Date().toISOString()
        });

        // Limit map size to avoid memory overflow
        if (messageStore.size > 500) {
            const firstKey = messageStore.keys().next().value;
            messageStore.delete(firstKey);
        }
    } catch (err) {}
}

// Function to handle message deletion/revocation
async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const configData = await loadAntideleteConfig();
        if (!configData.enabled) return;

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
        if (remoteJid.endsWith('@g.us')) {
            try {
                const groupMetadata = await sock.groupMetadata(remoteJid);
                const groupAdmins = groupMetadata.participants.filter(p => p.admin === 'admin' || p.admin === 'superadmin').map(p => p.id);
                if (groupAdmins.includes(deletedBy) && sender !== deletedBy) {
                    isAdminDelete = true;
                }
            } catch (e) {}
        }

        const timeString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateString = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo' });

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

        if (original.mediaType && original.mediaPath && fs.existsSync(original.mediaPath)) {
            try {
                if (original.mediaType === 'image') {
                    await sock.sendMessage(remoteJid, { image: { url: original.mediaPath }, caption: text, mentions: mentionsArray });
                } else if (original.mediaType === 'video') {
                    await sock.sendMessage(remoteJid, { video: { url: original.mediaPath }, caption: text, mentions: mentionsArray });
                } else if (original.mediaType === 'audio') {
                    await sock.sendMessage(remoteJid, { text, mentions: mentionsArray });
                    await sock.sendMessage(remoteJid, { audio: { url: original.mediaPath }, mimetype: 'audio/mpeg', ptt: false });
                } else if (original.mediaType === 'sticker') {
                    await sock.sendMessage(remoteJid, { text, mentions: mentionsArray });
                    await sock.sendMessage(remoteJid, { sticker: { url: original.mediaPath } });
                }
            } catch (e) {}
            try { fs.unlinkSync(original.mediaPath); } catch (e) {}
        } else {
            await sock.sendMessage(remoteJid, { text, mentions: mentionsArray });
        }

        messageStore.delete(messageId);
    } catch (err) {}
}

module.exports = { storeMessage, handleMessageRevocation };
