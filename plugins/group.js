/*
  * Project: SACHIYA-MD WhatsApp Bot
  * Plugin: Group Management (Fixed Add & Clean UI)
  * Author: SACHIYA
*/

const { cmd } = require("../command");
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// 🎯 Safe JID Extractor Helper Function
function getTargetUser(mek, quoted, args) {
  if (mek.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
    return mek.message.extendedTextMessage.contextInfo.mentionedJid[0];
  } else if (quoted?.sender) {
    return quoted.sender;
  } else if (args[0]) {
    const cleanNum = args[0].replace(/[^0-9]/g, "");
    if (cleanNum) return `${cleanNum}@s.whatsapp.net`;
  }
  return null;
}

// 🛡️ Helper to check if user is Admin or Owner
async function checkAdminOrOwner(sachiya, from, sender, isOwner) {
  if (isOwner) return true;
  try {
    const metadata = await sachiya.groupMetadata(from);
    const participants = metadata.participants || [];
    const senderObj = participants.find(p => p.id === sender);
    return senderObj && (senderObj.admin === 'admin' || senderObj.admin === 'superadmin');
  } catch (e) {
    return false;
  }
}

// ==========================================
// 1. KICK COMMAND
// ==========================================
cmd({
  pattern: "kick",
  alias: ["remove"],
  react: "🚪",
  desc: "Kick user from group",
  category: "group",
  filename: __filename,
}, async (sachiya, mek, m, { from, isGroup, isOwner, sender, reply, quoted, args }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command can only be used in groups!*");
    
    const isAdminOrOwner = await checkAdminOrOwner(sachiya, from, sender, isOwner);
    if (!isAdminOrOwner) return reply("❌ *You must be a group admin to use this command!*");

    const target = getTargetUser(mek, quoted, args);
    if (!target) return reply("⚠️ *Please mention, reply, or provide the number of the user to kick!*");

    const userNumber = target.split("@")[0];

    await sachiya.groupParticipantsUpdate(from, [target], "remove");
    return reply(`✅ *Successfully kicked:* +${userNumber}`, { mentions: [target] });
  } catch (e) {
    console.error("KICK ERROR:", e);
    return reply("❌ *Failed to kick user! Check if Bot has Admin rights.*");
  }
});

// ==========================================
// 2. PROMOTE COMMAND
// ==========================================
cmd({
  pattern: "promote",
  alias: ["addadmin"],
  react: "👑",
  desc: "Promote user to admin",
  category: "group",
  filename: __filename,
}, async (sachiya, mek, m, { from, isGroup, isOwner, sender, reply, quoted, args }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command can only be used in groups!*");
    
    const isAdminOrOwner = await checkAdminOrOwner(sachiya, from, sender, isOwner);
    if (!isAdminOrOwner) return reply("❌ *You must be a group admin to use this command!*");

    const target = getTargetUser(mek, quoted, args);
    if (!target) return reply("⚠️ *Please mention or reply to a user to promote!*");

    const userNumber = target.split("@")[0];

    await sachiya.groupParticipantsUpdate(from, [target], "promote");
    return reply(`👑 *Promoted to Admin:* +${userNumber}`, { mentions: [target] });
  } catch (e) {
    console.error("PROMOTE ERROR:", e);
    return reply("❌ *Failed to promote user!*");
  }
});

// ==========================================
// 3. DEMOTE COMMAND
// ==========================================
cmd({
  pattern: "demote",
  alias: ["removeadmin"],
  react: "📉",
  desc: "Demote admin to member",
  category: "group",
  filename: __filename,
}, async (sachiya, mek, m, { from, isGroup, isOwner, sender, reply, quoted, args }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command can only be used in groups!*");
    
    const isAdminOrOwner = await checkAdminOrOwner(sachiya, from, sender, isOwner);
    if (!isAdminOrOwner) return reply("❌ *You must be a group admin to use this command!*");

    const target = getTargetUser(mek, quoted, args);
    if (!target) return reply("⚠️ *Please mention or reply to an admin to demote!*");

    const userNumber = target.split("@")[0];

    await sachiya.groupParticipantsUpdate(from, [target], "demote");
    return reply(`📉 *Demoted to Member:* +${userNumber}`, { mentions: [target] });
  } catch (e) {
    console.error("DEMOTE ERROR:", e);
    return reply("❌ *Failed to demote user!*");
  }
});

// ==========================================
// 4. ADD / INVITE USER (With Invite Link Fallback)
// ==========================================
cmd({
  pattern: "add",
  alias: ["invite"],
  react: "➕",
  desc: "Add a user to the group",
  category: "group",
  filename: __filename
}, async (sachiya, mek, m, { from, isGroup, isOwner, sender, reply, args }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command can only be used in groups!*");
    
    const isAdminOrOwner = await checkAdminOrOwner(sachiya, from, sender, isOwner);
    if (!isAdminOrOwner) return reply("❌ *You must be a group admin to use this command!*");
    
    if (!args[0]) return reply("⚠️ *Please provide the phone number to add! (e.g: .add 9476xxxxxxx)*");

    const cleanNum = args[0].replace(/[^0-9]/g, "");
    const target = `${cleanNum}@s.whatsapp.net`;

    try {
      // 1. Try direct add
      await sachiya.groupParticipantsUpdate(from, [target], "add");
      return reply(`✅ *Successfully added:* +${cleanNum}`, { mentions: [target] });
    } catch (directError) {
      // 2. Fallback to Invite Link if restricted by WhatsApp
      const code = await sachiya.groupInviteCode(from);
      const inviteLink = `https://chat.whatsapp.com/${code}`;
      
      const inviteMsg = `╭━━━〔 *GROUP INVITATION* 〕━━━\n` +
                        `┃\n` +
                        `┃ 👋 Hello @${cleanNum},\n` +
                        `┃ Direct add restricted by WhatsApp!\n` +
                        `┃\n` +
                        `┃ 🔗 *Invite Link:* ${inviteLink}\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> *Powered by SACHIYA MD 💫*`;

      await sachiya.sendMessage(from, { text: inviteMsg, mentions: [target] });
      return reply(`⚠️ *Direct add restricted!* An invite link has been sent for +${cleanNum}.`);
    }

  } catch (e) {
    console.error("ADD ERROR:", e);
    return reply(`❌ *Failed to add user! Error: ${e.message}*`);
  }
});

// ==========================================
// 5. TAG ALL MEMBERS (OPEN TO ALL MEMBERS)
// ==========================================
cmd({
  pattern: "tagall",
  alias: ["everyone"],
  react: "📢",
  desc: "Tag all group members with a custom message",
  category: "group",
  filename: __filename,
}, async (sachiya, mek, m, { from, isGroup, reply, q }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command can only be used in groups!*");
    
    // Admin check removed so any normal member can use this command!

    const metadata = await sachiya.groupMetadata(from);
    const participants = metadata.participants || [];
    if (participants.length === 0) return reply("⚠️ *No members found!*");

    let mentions = participants.map(p => p.id);
    let customMessage = q ? q : "Attention everyone!";
    
    let text = `╭━━━〔 *SACHIYA-MD TAG ALL* 〕━━━\n`;
    text += `┃ 💬 *Message:* ${customMessage}\n`;
    text += `┃\n`;
    
    for (let mem of participants) {
      text += `┃ 📢 @${mem.id.split('@')[0]}\n`;
    }
    text += `┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n> *Powered by SACHIYA MD 💫*`;

    return sachiya.sendMessage(from, { text, mentions: mentions }, { quoted: mek });
  } catch (e) {
    console.error("TAGALL ERROR:", e);
    return reply("❌ *Failed to tag all members!*");
  }
});

// ==========================================
// 6. LIST ADMINS
// ==========================================
cmd({
  pattern: "admins",
  react: "👑",
  desc: "List all group admins",
  category: "group",
  filename: __filename,
}, async (sachiya, mek, m, { from, isGroup, reply }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command is for groups only!*");

    const metadata = await sachiya.groupMetadata(from);
    const adminList = metadata.participants.filter(p => p.admin);
    const mentions = adminList.map(a => a.id);

    let text = `╭━━━〔 *GROUP ADMINS* 〕━━━\n┃\n`;
    adminList.forEach(a => {
      text += `┃ 👑 @${a.id.split('@')[0]}\n`;
    });
    text += `┃\n╰━━━━━━━━━━━━━━━━━━━━━━━`;

    return sachiya.sendMessage(from, { text, mentions }, { quoted: mek });
  } catch (e) {
    console.error("ADMINS ERROR:", e);
  }
});

// ==========================================
// 7. MUTE / CLOSE GROUP
// ==========================================
cmd({
  pattern: "close",
  alias: ["mute", "lock"],
  react: "🔒",
  desc: "Set group chat to admin-only messages",
  category: "group",
  filename: __filename
}, async (sachiya, mek, m, { from, isGroup, isOwner, sender, reply }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command can only be used in groups!*");
    
    const isAdminOrOwner = await checkAdminOrOwner(sachiya, from, sender, isOwner);
    if (!isAdminOrOwner) return reply("❌ *Only group admins can lock the group!*");

    await sachiya.groupSettingUpdate(from, "announcement");
    return reply("🔒 *Group has been muted. Only admins can send messages now!*");
  } catch (e) {
    console.error("MUTE ERROR:", e);
    return reply("❌ *Failed to mute the group!*");
  }
});

// ==========================================
// 8. UNMUTE / OPEN GROUP
// ==========================================
cmd({
  pattern: "open",
  alias: ["unmute", "unlock"],
  react: "🔓",
  desc: "Allow everyone to send messages in the group",
  category: "group",
  filename: __filename
}, async (sachiya, mek, m, { from, isGroup, isOwner, sender, reply }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command can only be used in groups!*");
    
    const isAdminOrOwner = await checkAdminOrOwner(sachiya, from, sender, isOwner);
    if (!isAdminOrOwner) return reply("❌ *Only group admins can unlock the group!*");

    await sachiya.groupSettingUpdate(from, "not_announcement");
    return reply("🔓 *Group has been unmuted. Everyone can send messages now!*");
  } catch (e) {
    console.error("UNMUTE ERROR:", e);
    return reply("❌ *Failed to unmute the group!*");
  }
});

// ==========================================
// 9. GROUP LINK & REVOKE LINK
// ==========================================
cmd({
  pattern: "grouplink",
  alias: ["link", "glink"],
  react: "🔗",
  desc: "Get current invite link",
  category: "group",
  filename: __filename,
}, async (sachiya, mek, m, { from, isGroup, reply }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command is for groups only!*");

    const code = await sachiya.groupInviteCode(from);
    const linkText = `╭━━━〔 *GROUP INVITE LINK* 〕━━━\n` +
                     `┃\n` +
                     `┃ 🔗 https://chat.whatsapp.com/${code}\n` +
                     `┃\n` +
                     `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    return reply(linkText);
  } catch (e) {
    return reply("❌ *Failed to fetch group link! Make sure Bot is an Admin.*");
  }
});

cmd({
  pattern: "revoke",
  alias: ["resetlink"],
  react: "♻️",
  desc: "Reset group invite link",
  category: "group",
  filename: __filename,
}, async (sachiya, mek, m, { from, isGroup, isOwner, sender, reply }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command is for groups only!*");
    
    const isAdminOrOwner = await checkAdminOrOwner(sachiya, from, sender, isOwner);
    if (!isAdminOrOwner) return reply("❌ *Only admins can revoke the group link!*");

    await sachiya.groupRevokeInvite(from);
    return reply("♻️ *Group invite link has been successfully reset!*");
  } catch (e) {
    return reply("❌ *Failed to reset invite link! Make sure Bot is an Admin.*");
  }
});

// ==========================================
// 10. UPDATE GROUP DETAILS
// ==========================================
cmd({
  pattern: "setsubject",
  alias: ["setname"],
  react: "✏️",
  desc: "Change group name",
  category: "group",
  filename: __filename,
}, async (sachiya, mek, m, { from, isGroup, isOwner, sender, args, reply }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command is for groups only!*");
    
    const isAdminOrOwner = await checkAdminOrOwner(sachiya, from, sender, isOwner);
    if (!isAdminOrOwner) return reply("❌ *Only admins can change group name!*");
    
    if (!args[0]) return reply("⚠️ *Please provide a new group name!*");

    await sachiya.groupUpdateSubject(from, args.join(" "));
    return reply("✏️ *Group name successfully updated!*");
  } catch (e) {
    return reply("❌ *Failed to update group name!*");
  }
});

cmd({
  pattern: "setdesc",
  react: "📝",
  desc: "Change group description",
  category: "group",
  filename: __filename,
}, async (sachiya, mek, m, { from, isGroup, isOwner, sender, args, reply }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command is for groups only!*");
    
    const isAdminOrOwner = await checkAdminOrOwner(sachiya, from, sender, isOwner);
    if (!isAdminOrOwner) return reply("❌ *Only admins can change group description!*");
    
    if (!args[0]) return reply("⚠️ *Please provide a new group description!*");

    await sachiya.groupUpdateDescription(from, args.join(" "));
    return reply("📝 *Group description successfully updated!*");
  } catch (e) {
    return reply("❌ *Failed to update group description!*");
  }
});

cmd({
  pattern: "setpp",
  alias: ["seticon"],
  react: "🖼️",
  desc: "Set group profile picture",
  category: "group",
  filename: __filename
}, async (sachiya, mek, m, { from, isGroup, isOwner, sender, reply, quoted }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command is for groups only!*");
    
    const isAdminOrOwner = await checkAdminOrOwner(sachiya, from, sender, isOwner);
    if (!isAdminOrOwner) return reply("❌ *Only admins can change group profile photo!*");
    
    if (!quoted?.message?.imageMessage) return reply("🖼️ *Please reply to an image to set as group icon!*");

    const media = await downloadMediaMessage(quoted, 'buffer');
    await sachiya.updateProfilePicture(from, media);
    return reply("✅ *Group profile photo updated successfully!*");
  } catch (e) {
    console.error("SETPP ERROR:", e);
    return reply("❌ *Failed to update group profile photo!*");
  }
});

// ==========================================
// 11. GROUP INFO COMMAND
// ==========================================
cmd({
  pattern: "groupinfo",
  alias: ["ginfo", "infogroup"],
  react: "📄",
  desc: "Show group details",
  category: "group",
  filename: __filename,
}, async (sachiya, mek, m, { from, isGroup, reply }) => {
  try {
    if (!isGroup) return reply("⚠️ *This command is for groups only!*");

    const metadata = await sachiya.groupMetadata(from);
    const adminsCount = metadata.participants.filter(p => p.admin).length;
    const creation = new Date(metadata.creation * 1000).toLocaleDateString('en-US', { timeZone: 'Asia/Colombo' });
    const owner = metadata.owner || metadata.participants.find(p => p.admin === 'superadmin')?.id;
    const desc = metadata.desc || "No description set.";

    const infoCard = `╭━━━〔 *GROUP INFORMATION* 〕━━━\n` +
                      `┃\n` +
                      `┃ 👥 *Group:* ${metadata.subject}\n` +
                      `┃ 🆔 *ID:* ${metadata.id}\n` +
                      `┃ 🧑‍💼 *Owner:* ${owner ? `@${owner.split("@")[0]}` : "Not found"}\n` +
                      `┃ 📅 *Created:* ${creation}\n` +
                      `┃ 👤 *Members:* ${metadata.participants.length}\n` +
                      `┃ 🛡️ *Admins:* ${adminsCount}\n` +
                      `┃\n` +
                      `┃ 📝 *Description:*\n` +
                      `┃ ${desc}\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                      `> *Powered by SACHIYA MD 💫*`;

    return sachiya.sendMessage(from, { text: infoCard, mentions: owner ? [owner] : [] }, { quoted: mek });
  } catch (e) {
    console.error("GINFO ERROR:", e);
    return reply("❌ *Failed to fetch group info!*");
  }
});
