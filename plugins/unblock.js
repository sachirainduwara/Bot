const { commands } = require('../command');
const mongoose = require('mongoose');

const BlockSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    blockedChats: { type: Array, default: [] }
});
const BlockModel = mongoose.models.BlockList || mongoose.model('BlockList', BlockSchema);

async function saveBlockedListToMongo(chats) {
    try {
        await BlockModel.findOneAndUpdate(
            { _id: 'sachiyamd_blocks' },
            { blockedChats: chats },
            { upsert: true, new: true }
        );
    } catch (e) {}
}

commands.push({
    pattern: 'unblock',
    alias: ['unblockchat'],
    desc: 'Unblock bot to respond in this chat or group',
    category: 'owner',
    react: '✅',
    function: async (sock, mek, m, { reply, isOwner, senderNumber, from, isGroup }) => {
        const botNumber = sock.user.id.split(':')[0];
        const isSelfChat = from === sock.user.id || senderNumber === botNumber;
        
        if (!isOwner && !isSelfChat && !mek.key.fromMe) {
            return reply('⚠️ *මෙම විධානය භාවිතා කළ හැක්කේ බොට් හිමිකරුට පමණි!*');
        }

        if (!global.blockedChatsCache) global.blockedChatsCache = [];

        if (!global.blockedChatsCache.includes(from)) {
            return reply(isGroup ? '⚠️ *මෙම ගෲප් එක බ්ලොක් කර නොමැත!*' : '⚠️ *මෙම චැට් එක බ්ලොක් කර නොමැත!*');
        }

        global.blockedChatsCache = global.blockedChatsCache.filter(item => item !== from);
        await saveBlockedListToMongo(global.blockedChatsCache);

        if (isGroup) {
            return reply('✅ *මෙම ගෲප් එකට බොට් නැවත සක්‍රීය කරන ලදී (ගෲප් එක අන්බ්ලොක් කරන ලදී).*');
        } else {
            return reply('✅ *මෙම චැට් එකට බොට් නැවත සක්‍රීය කරන ලදී (චැට් එක අන්බ්ලොක් කරන ලදී).*');
        }
    }
});
