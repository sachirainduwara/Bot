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
    pattern: 'block',
    alias: ['blockchat'],
    desc: 'Block bot from responding in this chat or group',
    category: 'owner',
    react: '🚫',
    function: async (sock, mek, m, { reply, isOwner, senderNumber, from, isGroup }) => {
        const botNumber = sock.user.id.split(':')[0];
        const isSelfChat = from === sock.user.id || senderNumber === botNumber;
        
        if (!isOwner && !isSelfChat && !mek.key.fromMe) {
            return reply('⚠️ *මෙම විධානය භාවිතා කළ හැක්කේ බොට් හිමිකරුට පමණි!*');
        }

        if (!global.blockedChatsCache) global.blockedChatsCache = [];

        if (global.blockedChatsCache.includes(from)) {
            return reply(isGroup ? '⚠️ *මෙම ගෲප් එක දැනටමත් බ්ලොක් කර ඇත!*' : '⚠️ *මෙම චැට් එක දැනටමත් බ්ලොක් කර ඇත!*');
        }

        global.blockedChatsCache.push(from);
        await saveBlockedListToMongo(global.blockedChatsCache);

        if (isGroup) {
            return reply('🚫 *මෙම ගෲප් එකට බොට්ගේ ක්‍රියාකාරිත්වය සාර්ථකව අත්හිටුවන ලදී (ගෲප් එක බ්ලොක් කරන ලදී).*');
        } else {
            return reply('🚫 *මෙම චැට් එකට බොට්ගේ ක්‍රියාකාරිත්වය සාර්ථකව අත්හිටුවන ලදී (චැට් එක බ්ලොක් කරන ලදී).*');
        }
    }
});
