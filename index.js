const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestWaWebVersion,
  makeCacheableSignalKeyStore,
  downloadContentFromMessage,
  delay
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const P = require('pino');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const { writeFile } = require('fs/promises');

const config = require('./config');
const { sms } = require('./lib/msg');
const { commands } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = config.PREFIX || '.';
const ownerNumber = [config.OWNER_NUM || '94760579211'];
const authFolder = path.join(__dirname, '/auth_info_baileys/');

// --- Antidelete Setup & Storage ---
const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, 'data_antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, 'tmp');

if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// Folder size checking and cleaning
const getFolderSizeInMB = (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        let totalSize = 0;
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            if (fs.statSync(filePath).isFile()) {
                totalSize += fs.statSync(filePath).size;
            }
        }
        return totalSize / (1024 * 1024);
    } catch (err) {
        return 0;
    }
};

const cleanTempFolderIfLarge = () => {
    try {
        if (getFolderSizeInMB(TEMP_MEDIA_DIR) > 200) {
            const files = fs.readdirSync(TEMP_MEDIA_DIR);
            for (const file of files) {
                try { fs.unlinkSync(path.join(TEMP_MEDIA_DIR, file)); } catch {}
            }
        }
    } catch (err) {}
};
setInterval(cleanTempFolderIfLarge, 60 * 1000);

function loadAntideleteConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { enabled: false };
        return JSON.parse(fs.readFileSync(CONFIG_PATH));
    } catch {
        return { enabled: false };
    }
}

function saveAntideleteConfig(cfg) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2));
    } catch (err) {}
}

// --- MongoDB Session Database Schema ---
const SessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  data: { type: Object, required: true }
});
const SessionModel = mongoose.models.Session || mongoose.model('Session', SessionSchema);

// Load Session from MongoDB Atlas safely
async function loadSessionFromMongo() {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.SESSION_ID);
    }
    const sessionDoc = await SessionModel.findOne({ _id: 'sachiyamd_creds' });
    if (sessionDoc && sessionDoc.data) {
      if (!fs.existsSync(authFolder)) {
        fs.mkdirSync(authFolder, { recursive: true });
      }
      fs.writeFileSync(path.join(authFolder, 'creds.json'), JSON.stringify(sessionDoc.data, null, 2));
      console.log("✅ Session loaded successfully from MongoDB Atlas!");
    }
  } catch (e) {}
}

// Save Session to MongoDB Atlas safely
async function saveSessionToMongo() {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    const credsPath = path.join(authFolder, 'creds.json');
    if (!fs.existsSync(credsPath)) return;

    const rawData = fs.readFileSync(credsPath, 'utf8');
    if (!rawData || rawData.trim() === '') return;
    const credsData = JSON.parse(rawData);

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.SESSION_ID);
    }

    await SessionModel.findOneAndUpdate(
      { _id: 'sachiyamd_creds' },
      { data: credsData },
      { upsert: true, new: true }
    );
  } catch (e) {}
}

// Clear Session from MongoDB on Logout
async function clearMongoSession() {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.SESSION_ID);
    }
    await SessionModel.deleteOne({ _id: 'sachiyamd_creds' });
    console.log("🗑️ MongoDB session cleared due to logout.");
  } catch (e) {}
}

// 🛡️ Ultimate Console Cleaner to suppress decryption and session errors
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

console.error = function (...args) {
  const logText = args.join(' ');
  if (
    logText.includes('Failed to decrypt message') ||
    logText.includes('Bad MAC') ||
    logText.includes('No sessions') ||
    logText.includes('closing connection') ||
    logText.includes('Closing session') ||
    logText.includes('SessionEntry') ||
    logText.includes('Decrypted message') ||
    logText.includes('libsignal') ||
    logText.includes('Unexpected end of JSON') ||
    logText.includes('prekey bundle') ||
    logText.includes('_chains') ||
    logText.includes('currentRatchet') ||
    logText.includes('indexInfo') ||
    logText.includes('pendingPreKey')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.log = function (...args) {
  const logText = args.join(' ');
  if (
    logText.includes('SessionEntry') ||
    logText.includes('Closing session') ||
    logText.includes('Decrypted message') ||
    logText.includes('rootKey') ||
    logText.includes('creds.json successfully synced') ||
    logText.includes('_chains') ||
    logText.includes('currentRatchet') ||
    logText.includes('indexInfo') ||
    logText.includes('pendingPreKey')
  ) {
    return;
  }
  originalConsoleLog.apply(console, args);
};

const handleSilentErrors = (err) => {
  if (!err) return true;
  const msg = err.message || err.toString() || "";
  if (msg.includes('Failed to decrypt') || msg.includes('Bad MAC') || msg.includes('No sessions') || msg.includes('libsignal') || msg.includes('JSON')) {
    return true;
  }
  return false;
};

process.on('uncaughtException', (err) => {
  if (handleSilentErrors(err)) return;
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  if (handleSilentErrors(err)) return;
  console.error('Unhandled Rejection:', err);
});

// 1. Load Plugins Safely
function loadPlugins() {
  let pluginsPath = path.join(__dirname, "plugins");
  if (!fs.existsSync(pluginsPath)) {
    pluginsPath = path.join(__dirname, "Plugins");
  }

  if (fs.existsSync(pluginsPath)) {
    fs.readdirSync(pluginsPath).forEach((plugin) => {
      if (path.extname(plugin).toLowerCase() === ".js") {
        try {
          require(path.join(pluginsPath, plugin));
        } catch (e) {
          console.error(`❌ Error loading plugin ${plugin}:`, e.message);
        }
      }
    });
    console.log(`✅ Loaded ${commands.length} Commands Successfully!`);
  } else {
    console.error("❌ Plugins folder not found!");
  }
}

// 2. WhatsApp Connection Logic with MongoDB Session Support
async function connectToWA() {
  console.log("\n⏳ Connecting SACHIYA MD ✨...");

  if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
  }

  // Load session from MongoDB Atlas first
  await loadSessionFromMongo();

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestWaWebVersion();
  
  const logger = P({ level: 'fatal' });

  const sachiya = makeWASocket({
    logger,
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "120.0.6099.109"],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    version,
    syncFullHistory: false,
    fireInitQueries: true,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,
    getMessage: async (key) => {
      try {
        return { conversation: 'Hello, I am SACHIYA-MD active bot!' };
      } catch (e) {
        return { conversation: '' };
      }
    }
  });

  // Pairing Code Generation ONLY IF NOT REGISTERED
  if (!sachiya.authState.creds.registered) {
    let targetNumber = (config.OWNER_NUM || ownerNumber[0]).replace(/[^0-9]/g, '');
    
    if (!targetNumber) {
      console.log("❌ OWNER_NUM / Phone Number is missing in config.js!");
    } else {
      console.log(`⚠️ Waiting for socket connection to stabilize before requesting Pairing Code...`);
      setTimeout(async () => {
        try {
          console.log(`⚠️ Requesting Pairing Code for number: ${targetNumber}`);
          let code = await sachiya.requestPairingCode(targetNumber);
          code = code?.match(/.{1,4}/g)?.join("-") || code;
          console.log("\n========================================");
          console.log(`🔥 YOUR PAIRING CODE:  [  ${code}  ]`);
          console.log("========================================");
        } catch (err) {
          console.error("❌ Pairing Code generation error:", err.message || err);
        }
      }, 10000);
    }
  } else {
    console.log("⚡ Active Session Found! Connecting directly without Pairing Code...");
  }

  let isConnectedOnce = false;

  sachiya.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      if (isConnectedOnce) return; 

      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        console.error("❌ Session logged out from WhatsApp! Clearing MongoDB session...");
        await clearMongoSession();
        if (fs.existsSync(authFolder)) {
          fs.rmSync(authFolder, { recursive: true, force: true });
        }
        process.exit(1);
      } else {
        setTimeout(() => connectToWA(), 3000);
      }
    } else if (connection === 'open') {
      if (isConnectedOnce) return;
      isConnectedOnce = true;

      console.log('\n╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮');
      console.log('┃ 🎉 SACHIYA MD CONNECTED SUCCESSFULLY!  ');
      console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n');

      // Save session to MongoDB immediately after successful connection
      await saveSessionToMongo();

      const ownerJid = ownerNumber[0] + "@s.whatsapp.net";
      const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo' });
      const time = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const aliveImg = config.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";
      
      const connectedSuccessMsg = `╭━━━〔 *SACHIYA-MD CONNECTED* 〕━━━\n` +
                                   `┃\n` +
                                   `┃ 🤖 *Bot Status:* Online & Active ✅\n` +
                                   `┃ ⚙️ *Prefix:* [ ${prefix} ]\n` +
                                   `┃ 📅 *Date:* ${date}\n` +
                                   `┃ ⏰ *Time:* ${time}\n` +
                                   `┃\n` +
                                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                   `> *⚡ Powered by SACHIYA-MD 💫*`;

      try {
        await sachiya.sendMessage(ownerJid, {
          image: { url: aliveImg },
          caption: connectedSuccessMsg
        });
      } catch (err) {
        await sachiya.sendMessage(ownerJid, { text: connectedSuccessMsg }).catch(() => {});
      }
    }
  });

  sachiya.ev.on('creds.update', async () => {
    await saveCreds();
    await saveSessionToMongo();
  });

  // Call Reject Handler
  sachiya.ev.on('call', async (callEvents) => {
    for (const call of callEvents) {
      if (call.status === 'offer') {
        const callerJid = call.from;
        try {
          await sachiya.rejectCall(call.id, callerJid);
          await sachiya.sendMessage(callerJid, { text: `කෝල් නොකර මැසේජ් එකක් දාපන් බං 😏\nමම මේ ඩයලොග් එකේ සිග්නල් හොයනවා🤧` });
        } catch (e) {}
      }
    }
  });

  // ✉️ Direct Message Stream Handler (Active for all chats)
  sachiya.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages ? chatUpdate.messages[0] : chatUpdate[0];
      if (!mek || !mek.message) return;
      if (mek.key && mek.key.remoteJid === 'status@broadcast') return;

      // Handle Antidelete Store & Message Revocation
      if (mek.message.protocolMessage && mek.message.protocolMessage.type === 0) {
        // Message deleted event
        try {
          const cfg = loadAntideleteConfig();
          if (cfg.enabled) {
            const messageId = mek.message.protocolMessage.key.id;
            const deletedBy = mek.participant || mek.key.participant || mek.key.remoteJid;
            const targetOwnerJid = ownerNumber[0] + '@s.whatsapp.net';

            if (!deletedBy.includes(sachiya.user.id) && deletedBy !== targetOwnerJid) {
              const original = messageStore.get(messageId);
              if (original) {
                const sender = original.sender;
                const senderName = sender.split('@')[0];
                let groupName = '';
                if (original.group) {
                  try {
                    const meta = await sachiya.groupMetadata(original.group);
                    groupName = meta.subject;
                  } catch (e) {}
                }

                const time = new Date().toLocaleString('en-US', {
                  timeZone: 'Asia/Colombo',
                  hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit',
                  day: '2-digit', month: '2-digit', year: 'numeric'
                });

                let text = `╭━━━〔 *🗑️ SACHIYA-MD ANTIDELETE* 〕━━━\n` +
                           `┃\n` +
                           `┃ ❌ *Deleted By:* @${deletedBy.split('@')[0]}\n` +
                           `┃ 👤 *Original Sender:* @${senderName}\n` +
                           `┃ 📱 *Number:* wa.me/${sender.split('@')[0]}\n` +
                           `┃ 🕒 *Time:* ${time}\n`;

                if (groupName) text += `┃ 👥 *Group:* ${groupName}\n`;
                text += `┃\n`;

                if (original.content) {
                  text += `┣ *💬 Deleted Message:*\n` +
                          `┃ ${original.content}\n` +
                          `┃\n`;
                }

                text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> *⚡ Powered by SACHIYA-MD 💫*`;

                await sachiya.sendMessage(targetOwnerJid, {
                  text,
                  mentions: [deletedBy, sender]
                });

                if (original.mediaType && fs.existsSync(original.mediaPath)) {
                  const mediaOpts = {
                    caption: `╭━━━〔 *📁 DELETED ${original.mediaType.toUpperCase()}* 〕━━━\n` +
                             `┃\n` +
                             `┃ 👤 *Sender:* @${senderName}\n` +
                             `┃\n` +
                             `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                             `> *⚡ Powered by SACHIYA-MD 💫*`,
                    mentions: [sender]
                  };

                  if (original.mediaType === 'image') {
                    await sachiya.sendMessage(targetOwnerJid, { image: { url: original.mediaPath }, ...mediaOpts });
                  } else if (original.mediaType === 'video') {
                    await sachiya.sendMessage(targetOwnerJid, { video: { url: original.mediaPath }, ...mediaOpts });
                  } else if (original.mediaType === 'audio') {
                    await sachiya.sendMessage(targetOwnerJid, { audio: { url: original.mediaPath }, mimetype: 'audio/mpeg', ptt: false, ...mediaOpts });
                  } else if (original.mediaType === 'sticker') {
                    await sachiya.sendMessage(targetOwnerJid, { sticker: { url: original.mediaPath }, ...mediaOpts });
                  }

                  try { fs.unlinkSync(original.mediaPath); } catch {}
                }
                messageStore.delete(messageId);
              }
            }
          }
        } catch (e) {}
      } else {
        // Store normal incoming message
        try {
          const cfg = loadAntideleteConfig();
          if (cfg.enabled && mek.key?.id) {
            const messageId = mek.key.id;
            let content = '';
            let mediaType = '';
            let mediaPath = '';
            let isViewOnce = false;
            const sender = mek.key.participant || mek.key.remoteJid;

            const voContainer = mek.message?.viewOnceMessageV2?.message || mek.message?.viewOnceMessage?.message;
            if (voContainer) {
              if (voContainer.imageMessage) {
                mediaType = 'image';
                content = voContainer.imageMessage.caption || '';
                const buf = await downloadContentFromMessage(voContainer.imageMessage, 'image');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                await writeFile(mediaPath, buf);
                isViewOnce = true;
              } else if (voContainer.videoMessage) {
                mediaType = 'video';
                content = voContainer.videoMessage.caption || '';
                const buf = await downloadContentFromMessage(voContainer.videoMessage, 'video');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                await writeFile(mediaPath, buf);
                isViewOnce = true;
              }
            } else if (mek.message?.conversation) {
              content = mek.message.conversation;
            } else if (mek.message?.extendedTextMessage?.text) {
              content = mek.message.extendedTextMessage.text;
            } else if (mek.message?.imageMessage) {
              mediaType = 'image';
              content = mek.message.imageMessage.caption || '';
              const buf = await downloadContentFromMessage(mek.message.imageMessage, 'image');
              mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
              await writeFile(mediaPath, buf);
            } else if (mek.message?.videoMessage) {
              mediaType = 'video';
              content = mek.message.videoMessage.caption || '';
              const buf = await downloadContentFromMessage(mek.message.videoMessage, 'video');
              mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
              await writeFile(mediaPath, buf);
            } else if (mek.message?.audioMessage) {
              mediaType = 'audio';
              const mime = mek.message.audioMessage.mimetype || '';
              const ext = mime.includes('ogg') ? 'ogg' : 'mp3';
              const buf = await downloadContentFromMessage(mek.message.audioMessage, 'audio');
              mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.${ext}`);
              await writeFile(mediaPath, buf);
            } else if (mek.message?.stickerMessage) {
              mediaType = 'sticker';
              const buf = await downloadContentFromMessage(mek.message.stickerMessage, 'sticker');
              mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
              await writeFile(mediaPath, buf);
            }

            messageStore.set(messageId, {
              content,
              mediaType,
              mediaPath,
              sender,
              group: mek.key.remoteJid.endsWith('@g.us') ? mek.key.remoteJid : null,
              timestamp: new Date().toISOString()
            });

            // Anti-ViewOnce forwarding
            if (isViewOnce && mediaType && fs.existsSync(mediaPath)) {
              try {
                const targetOwnerJid = ownerNumber[0] + '@s.whatsapp.net';
                const senderName = sender.split('@')[0];
                const voOpts = {
                  caption: `╭━━━〔 *🛡️ SACHIYA-MD VIEW ONCE* 〕━━━\n` +
                           `┃\n` +
                           `┃ 📸 *Type:* ${mediaType.toUpperCase()}\n` +
                           `┃ 👤 *Sender:* @${senderName}\n` +
                           `┃\n` +
                           `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                           `> *⚡ Powered by SACHIYA-MD 💫*`,
                  mentions: [sender]
                };
                if (mediaType === 'image') {
                  await sachiya.sendMessage(targetOwnerJid, { image: { url: mediaPath }, ...voOpts });
                } else if (mediaType === 'video') {
                  await sachiya.sendMessage(targetOwnerJid, { video: { url: mediaPath }, ...voOpts });
                }
                try { fs.unlinkSync(mediaPath); } catch {}
              } catch (e) {}
            }
          }
        } catch (e) {}
      }

      let msgType = getContentType(mek.message);
      if (msgType === 'ephemeralMessage') {
        mek.message = mek.message.ephemeralMessage.message;
        msgType = getContentType(mek.message);
      } else if (msgType === 'viewOnceMessage') {
        mek.message = mek.message.viewOnceMessage.message;
        msgType = getContentType(mek.message);
      } else if (msgType === 'viewOnceMessageV2') {
        mek.message = mek.message.viewOnceMessageV2.message;
        msgType = getContentType(mek.message);
      }

      const m = sms(sachiya, mek);
      const from = mek.key.remoteJid;
      const quoted = m.quoted ? m.quoted : null;

      const rawBody = msgType === 'conversation' ? mek.message.conversation :
                      msgType === 'extendedTextMessage' ? mek.message.extendedTextMessage.text :
                      msgType === 'imageMessage' ? mek.message.imageMessage.caption :
                      msgType === 'videoMessage' ? mek.message.videoMessage.caption : 
                      mek.text || m.body || '';
      
      const body = rawBody ? String(rawBody) : '';
      const isCmd = body.startsWith(prefix);
      if (!isCmd) return;

      const commandName = body.slice(prefix.length).trim().split(" ")[0].toLowerCase();
      const args = body.trim().split(/ +/).slice(1);
      const q = args.join(' ');

      const workMode = config.MODE ? config.MODE.toLowerCase() : "public";
      const rawBotJid = sachiya.user ? sachiya.user.id : '';
      const botJid = jidNormalizedUser(rawBotJid);
      const botNumber = botJid ? botJid.split('@')[0] : '';
      
      const isGroup = from.endsWith('@g.us');
      const rawSender = isGroup ? (mek.key.participant || mek.participant) : from;
      const sender = jidNormalizedUser(rawSender || from);
      const senderNumber = sender ? sender.split('@')[0] : '';

      const isMe = botNumber && senderNumber ? botNumber.includes(senderNumber) : false;
      const isOwner = ownerNumber.includes(senderNumber) || isMe;

      if (workMode === "private" && !isOwner) {
        return;
      }

      const reply = (text) => sachiya.sendMessage(from, { text }, { quoted: mek });

      // Handle embedded .antidelete command directly
      if (commandName === 'antidelete') {
        if (!mek.key.fromMe && !isOwner) {
          return reply('⚠️ *මෙම විධානය භාවිතා කළ හැක්කේ බොට් හිමිකරුට (Owner) පමණි!*');
        }

        const cfg = loadAntideleteConfig();
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

        if (q.toLowerCase() === 'on') {
          cfg.enabled = true;
        } else if (q.toLowerCase() === 'off') {
          cfg.enabled = false;
        } else {
          return reply('⚠️ *වැරදි විධානයකි! භාවිතය සඳහා .antidelete ලෙස යොදන්න.*');
        }

        saveAntideleteConfig(cfg);
        return reply(`✨ *Antidelete System successfully ${q.toLowerCase() === 'on' ? 'Enabled 🟢' : 'Disabled 🔴'}!*`);
      }

      const cmd = commands.find((c) => c.pattern === commandName || (c.alias && c.alias.includes(commandName)));
      if (cmd) {
        if (cmd.react) await sachiya.sendMessage(from, { react: { text: cmd.react, key: mek.key } }).catch(() => {});
        try {
          await cmd.function(sachiya, mek, m, {
            from, quoted, body, isCmd, command: commandName, args, q, reply, isGroup, sender, senderNumber, isOwner
          });
        } catch (e) {
          console.error("[PLUGIN ERROR]", e);
        }
      }
    } catch (err) {
      if (!handleSilentErrors(err)) {
        console.error("Message Upsert Error:", err);
      }
    }
  });
}

loadPlugins();
connectToWA();

app.get("/", (req, res) => {
  res.send("Hey, SACHIYA MD started successfully with MongoDB! ✅");
});

app.listen(port, () => console.log(`🚀 Server listening on http://localhost:${port}`));
