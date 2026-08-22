const config = require('../config');

async function isOwnerOrSudo(senderId, sock = null, chatId = null) {
    try {
        // config.js එකෙන් owner number එක ලබා ගැනීම (Owner number එක string එකක් ලෙස හෝ array එකක් ලෙස තිබිය හැක)
        let ownerNum = config.OWNER_NUMBER || config.owner || '';
        if (Array.isArray(ownerNum)) ownerNum = ownerNum[0];
        if (!ownerNum) return false;

        const ownerNumberClean = String(ownerNum).split(':')[0].split('@')[0].trim();
        const senderIdClean = String(senderId).split(':')[0].split('@')[0].trim();

        // 1. Sender සහ Owner නම්බර් එක සමාන නම්
        if (senderIdClean === ownerNumberClean) {
            return true;
        }

        // 2. fromMe පරීක්ෂා කිරීම (Bot ගේ own account එකෙන් එවුවොත්)
        if (senderId.includes(ownerNumberClean)) {
            return true;
        }

        return false;
    } catch (e) {
        console.error('❌ [isOwnerOrSudo] Error:', e);
        return false;
    }
}

module.exports = isOwnerOrSudo;
