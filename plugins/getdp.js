const { cmd } = require('../command');

cmd({
    pattern: "getdp",
    alias: ["dp", "getprofilepic"],
    desc: "Get profile picture of a user (Inbox, Reply, Mention or Number)",
    category: "tools",
    filename: __filename
},
async (sock, mek, m, { from, q, reply, isGroup, mentionedJid }) => {
    try {
        let targetJid = '';

        // 1. If replied to a message, get that user's JID
        if (mek.quoted) {
            targetJid = mek.quoted.sender;
        } 
        // 2. If someone is mentioned in the group
        else if (mentionedJid && mentionedJid.length > 0) {
            targetJid = mentionedJid[0];
        } 
        // 3. If a phone number or query is provided (e.g. .getdp 9477xxxxxxx)
        else if (q) {
            let cleaned = q.replace(/[^0-9]/g, '');
            if (cleaned.length > 5) {
                targetJid = cleaned + '@s.whatsapp.net';
            }
        }

        // 4. If no target specified: 
        // - In a Group: get the sender's DP who typed the command.
        // - In Inbox (DM): get the other person's (or owner's) DP of that chat.
        if (!targetJid) {
            targetJid = from;
        }

        // Fetch profile picture URL with HD fallback
        let dpUrl;
        try {
            dpUrl = await sock.profilePictureUrl(targetJid, 'image');
        } catch (err) {
            return reply('⚠️ *මෙම පරිශීලකයාගේ Profile Picture (DP) එක ලබා ගැනීමට නොහැක (Privacity දමා තිබිය හැක).*');
        }

        if (!dpUrl) {
            return reply('⚠️ *මෙම පරිශීලකයාට Profile Picture එකක් නොමැත.*');
        }

        // Send the profile picture
        await sock.sendMessage(from, {
            image: { url: dpUrl },
            caption: `*✨ SACHIYA-MD DP VIEWER ✨*\n\n> *👤 Target User:* @${targetJid.split('@')[0]}`,
            mentions: [targetJid]
        }, { quoted: mek });

    } catch (error) {
        console.error('GetDP Error:', error);
        return reply(`⚠️ *දෝෂයක් මතු විය: ${error.message}*`);
    }
});
