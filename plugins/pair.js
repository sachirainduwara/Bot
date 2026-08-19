const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  Browsers
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const P = require('pino');
const mongoose = require('mongoose');
const { cmd } = require('../command');
const config = require('../config');

// Multi-User Session Schema for MongoDB
const MultiSessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  creds: { type: Object, required: true },
  pairedNumber: { type: String, required: true }
});
const MultiSessionModel = mongoose.models.MultiSession || mongoose.model('MultiSession', MultiSessionSchema);

global.activeSubSockets = global.activeSubSockets || {};

// Helper function to verify owner strictly
function checkIsOwner(senderNumber, isOwnerFlag) {
  const configuredOwner = (config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
  const cleanSender = (senderNumber || '').replace(/[^0-9]/g, '');
  return isOwnerFlag || cleanSender === configuredOwner || cleanSender.includes(configuredOwner);
}

// 1. Pair Command (.pair <number>)
cmd({
  pattern: "pair",
  alias: ["link", "connect"],
  desc: "Pair another user to the bot via pairing code",
  category: "owner",
  react: "🔗",
  filename: __filename
}, async (sachiya, mek, m, { from, q, isOwner, reply, senderNumber }) => {
  
  if (!checkIsOwner(senderNumber, isOwner)) {
    return reply("❌ This command is only for the bot owner!");
  }
  
  if (!q) {
    return reply("❌ Please provide a phone number with country code!\nExample: .pair 94771234567");
  }

  const targetNum = q.replace(/[^0-9]/g, '');
  if (!targetNum || targetNum.length < 10) {
    return reply("❌ Invalid phone number! Please enter a valid number with country code.");
  }

  await reply(`⏳ Requesting Pairing Code for *+${targetNum}*... Please wait.`);

  const subAuthFolder = path.join(__dirname, `../auth_sub_${targetNum}`);
  if (!fs.existsSync(subAuthFolder)) {
    fs.mkdirSync(subAuthFolder, { recursive: true });
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(subAuthFolder);
    const logger = P({ level: 'silent' });

    const subSock = makeWASocket({
      logger,
      printQRInTerminal: false,
      browser: Browsers.macOS("Chrome"),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      markOnlineOnConnect: true,
      generateHighQualityLinkPreview: false,
    });

    // Request pairing code after socket initialization
    setTimeout(async () => {
      try {
        let code = await subSock.requestPairingCode(targetNum);
        code = code?.match(/.{1,4}/g)?.join("-") || code;

        // Clean and clear text layout with code block for easy copying
        const pairMsg = `╭━━━〔 *SACHIYA-MD PAIRING* 〕━━━\n` +
                        `┃\n` +
                        `┃ 📱 *Target Number:* +${targetNum}\n` +
                        `┃ 🔑 *Pairing Code:* \`${code}\`\n` +
                        `┃\n` +
                        `┃ _Tap the code above to copy it_ 👆\n` +
                        `┃ _Linked Devices -> Link with phone number_\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> *⚡ Powered by SACHIYA-MD 💫*`;

        const pairImg = config.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";
        
        await sachiya.sendMessage(from, { 
          image: { url: pairImg }, 
          caption: pairMsg 
        }, { quoted: mek });

      } catch (err) {
        console.error("Pairing Code Error:", err);
        reply("❌ Failed to generate pairing code. Please check the number or try again later.");
      }
    }, 4000);

    subSock.ev.on('creds.update', async () => {
      await saveCreds();
      try {
        const credsPath = path.join(subAuthFolder, 'creds.json');
        if (fs.existsSync(credsPath)) {
          const rawData = fs.readFileSync(credsPath, 'utf8');
          if (rawData) {
            const credsData = JSON.parse(rawData);
            if (mongoose.connection.readyState === 1) {
              await MultiSessionModel.findOneAndUpdate(
                { _id: targetNum },
                { creds: credsData, pairedNumber: targetNum },
                { upsert: true, new: true }
              );
            }
          }
        }
      } catch (e) {
        console.error("Multi-Session Mongo Save Error:", e);
      }
    });

    subSock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'open') {
        global.activeSubSockets[targetNum] = subSock;
        await sachiya.sendMessage(from, { text: `✅ Successfully linked and connected user *+${targetNum}* to SACHIYA-MD database! 🎉` }, { quoted: mek });
      } else if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        if (statusCode === DisconnectReason.loggedOut) {
          delete global.activeSubSockets[targetNum];
          await MultiSessionModel.deleteOne({ _id: targetNum });
          if (fs.existsSync(subAuthFolder)) {
            fs.rmSync(subAuthFolder, { recursive: true, force: true });
          }
          await sachiya.sendMessage(from, { text: `⚠️ User *+${targetNum}* has logged out or session was revoked.` }, { quoted: mek });
        }
      }
    });

  } catch (e) {
    console.error("Pair Process Error:", e);
    reply("❌ An error occurred during the pairing process.");
  }
});

// 2. List Paired Users (.pairedlist)
cmd({
  pattern: "pairedlist",
  alias: ["sessions", "linkedlist"],
  desc: "View all paired user numbers",
  category: "owner",
  react: "📋",
  filename: __filename
}, async (sachiya, mek, m, { from, isOwner, reply, senderNumber }) => {
  if (!checkIsOwner(senderNumber, isOwner)) {
    return reply("❌ This command is only for the bot owner!");
  }

  try {
    if (mongoose.connection.readyState === 1) {
      const sessions = await MultiSessionModel.find({});
      if (!sessions || sessions.length === 0) {
        return reply("ℹ️ No users are currently paired/linked to the bot.");
      }

      let listText = `╭━━━〔 *PAIRED USERS LIST* 〕━━━\n`;
      sessions.forEach((s, index) => {
        listText += `┃ ${index + 1}. *+${s.pairedNumber}* ✅\n`;
      });
      listText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n> *Total Linked: ${sessions.length}*`;
      return reply(listText);
    } else {
      return reply("❌ Database connection is not active.");
    }
  } catch (e) {
    console.error("List Error:", e);
    reply("❌ Error fetching paired list.");
  }
});

// 3. Logout/Remove Paired User (.unpair <number>)
cmd({
  pattern: "unpair",
  alias: ["removepair", "dellink"],
  desc: "Disconnect and remove a paired user session",
  category: "owner",
  react: "🔌",
  filename: __filename
}, async (sachiya, mek, m, { from, q, isOwner, reply, senderNumber }) => {
  if (!checkIsOwner(senderNumber, isOwner)) {
    return reply("❌ This command is only for the bot owner!");
  }
  
  if (!q) {
    return reply("❌ Please provide the paired phone number to remove!\nExample: .unpair 94771234567");
  }

  const targetNum = q.replace(/[^0-9]/g, '');
  if (!targetNum) return reply("❌ Invalid number provided.");

  try {
    if (mongoose.connection.readyState === 1) {
      const exists = await MultiSessionModel.findOne({ _id: targetNum });
      if (!exists) {
        return reply(`❌ Error: Bot එක මේ අංකයින් (*+${targetNum}*) ලින්ක් වී නැත!`);
      }

      if (global.activeSubSockets[targetNum]) {
        try {
          global.activeSubSockets[targetNum].logout();
        } catch (e) {}
        delete global.activeSubSockets[targetNum];
      }

      await MultiSessionModel.deleteOne({ _id: targetNum });

      const subAuthFolder = path.join(__dirname, `../auth_sub_${targetNum}`);
      if (fs.existsSync(subAuthFolder)) {
        fs.rmSync(subAuthFolder, { recursive: true, force: true });
      }

      return reply(`✅ Successfully logged out and removed session for user *+${targetNum}*! 🗑️`);
    } else {
      return reply("❌ Database connection is not active.");
    }
  } catch (e) {
    console.error("Unpair Error:", e);
    reply("❌ Error processing unpair command.");
  }
});
