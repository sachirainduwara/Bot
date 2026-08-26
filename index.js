const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const P = require('pino');
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');

const config = require('./config');
const { sms } = require('./lib/msg');
const { commands } = require('./command');

// --- Plugin imports ---
const { storeMessage, handleMessageRevocation } = require('./plugins/antidelete');
const { handleAutoread } = require('./plugins/autoread');
const { handleAutoReact } = require('./plugins/autoreact');
const { handleAutoStatus } = require('./plugins/autostatus');

global.activeSettingsMenus = global.activeSettingsMenus || new Map();

// ⚡ Ultra Fast Bot Start Timestamp to Ignore Old Synced Messages
const botStartTime = Date.now();

const app = express();
const port = process.env.PORT || 8000;

const server = http.createServer(app);

const prefix = config.PREFIX || '.';
const ownerNumber = [config.OWNER_NUM || '94760579211'];
const authFolder = path.join(__dirname, '/auth_info_baileys/');

global.blockedChatsCache = [];
global.hasSentBootMessage = false; 
global.hasLoggedConsoleOnce = false; 

const SessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  data: { type: Object, required: true }
});
const SessionModel = mongoose.models.Session || mongoose.model('Session', SessionSchema);

const BlockSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  blockedChats: { type: Array, default: [] }
});
const BlockModel = mongoose.models.BlockList || mongoose.model('BlockList', BlockSchema);

// Mongoose Models for Instant Live Database Checking
const AntiCallModel = mongoose.models.AntiCall || mongoose.model('AntiCall', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));
const AntideleteModel = mongoose.models.Antidelete || mongoose.model('Antidelete', new mongoose.Schema({ _id: { type: String, required: true }, enabled: { type: Boolean, default: false } }));
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', new mongoose.Schema({ _id: { type: String, required: true }, ireact: { type: Boolean, default: true }, greact: { type: Boolean, default: true } }));
const AutoReadModel = mongoose.models.AutoRead || mongoose.model('AutoRead', new mongoose.Schema({ _id: { type: String, required: true }, enabled: { type: Boolean, default: false } }));
const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));

async function loadSessionFromMongo() {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.SESSION_ID, { serverSelectionTimeoutMS: 5000 });
    }
    const sessionDoc = await SessionModel.findOne({ _id: 'sachiyamd_creds' });
    if (sessionDoc && sessionDoc.data) {
      if (!fs.existsSync(authFolder)) {
        fs.mkdirSync(authFolder, { recursive: true });
      }
      fs.writeFileSync(path.join(authFolder, 'creds.json'), JSON.stringify(sessionDoc.data, null, 2));
      if (!global.hasLoggedConsoleOnce) {
        console.log("✅ Session loaded successfully from MongoDB Atlas!");
      }
    }
  } catch (e) {
    console.error("❌ MongoDB Session Load Error:", e);
  }
}

async function saveSessionToMongo() {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    const credsPath = path.join(authFolder, 'creds.json');
    if (!fs.existsSync(credsPath)) return;

    const rawData = fs.readFileSync(credsPath, 'utf8');
    if (!rawData || rawData.trim() === '') return;
    const credsData = JSON.parse(rawData);

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.SESSION_ID, { serverSelectionTimeoutMS: 5000 });
    }

    await SessionModel.findOneAndUpdate(
      { _id: 'sachiyamd_creds' },
      { data: credsData },
      { upsert: true, new: true }
    );
  } catch (e) {
    console.error("❌ MongoDB Session Save Error:", e);
  }
}

async function clearMongoSession() {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.SESSION_ID, { serverSelectionTimeoutMS: 5000 });
    }
    await SessionModel.deleteOne({ _id: 'sachiyamd_creds' });
    console.log("🗑️ MongoDB session cleared due to logout.");
  } catch (e) {
    console.error("❌ MongoDB Session Clear Error:", e);
  }
}

async function loadBlockedListIntoCache() {
  try {
    if (mongoose.connection.readyState === 0 && config.SESSION_ID) {
      await mongoose.connect(config.SESSION_ID, { serverSelectionTimeoutMS: 5000 });
    }
    const doc = await BlockModel.findOne({ _id: 'sachiyamd_blocks' });
    if (doc && doc.blockedChats) {
      global.blockedChatsCache = doc.blockedChats;
    } else {
      global.blockedChatsCache = [];
    }
  } catch (e) {
    global.blockedChatsCache = [];
  }
}

// 🛡️ Ultimate Stream & Console Interceptor
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

const hiddenKeywords = [
  'SessionEntry', 'Closing session', '_chains', 'currentRatchet', 
  'indexInfo', 'pendingPreKey', 'registrationId', 'ephemeralKeyPair', 
  'privKey', 'remoteIdentityKey', 'pubKey', 'rootKey', 'chainKey', 
  'messageKeys', 'chainType', 'closed', 'used', 'created', 'libsignal',
  'Decrypted message', 'Failed to decrypt', 'Bad MAC', 'prekey bundle',
  'syncing', 'Syncing', 'finish', 'History', 'history', 'app-state-sync'
];

process.stdout.write = function (chunk, encoding, callback) {
  if (typeof chunk === 'string' && hiddenKeywords.some(keyword => chunk.includes(keyword))) {
    return true;
  }
  return originalStdoutWrite(chunk, encoding, callback);
};

process.stderr.write = function (chunk, encoding, callback) {
  if (typeof chunk === 'string' && hiddenKeywords.some(keyword => chunk.includes(keyword))) {
    return true;
  }
  return originalStderrWrite(chunk, encoding, callback);
};

const originalConsoleError = console.error;
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;

console.error = function (...args) {
  const logText = args.join(' ');
  if (hiddenKeywords.some(word => logText.includes(word))) return;
  originalConsoleError.apply(console, args);
};

console.log = function (...args) {
  const logText = args.join(' ');
  if (hiddenKeywords.some(word => logText.includes(word))) return;
  originalConsoleLog.apply(console, args);
};

console.warn = function (...args) {
  const logText = args.join(' ');
  if (hiddenKeywords.some(word => logText.includes(word))) return;
  originalConsoleWarn.apply(console, args);
};

const handleSilentErrors = (err) => {
  if (!err) return true;
  const msg = err.message || err.toString() || "";
  if (hiddenKeywords.some(word => msg.includes(word))) return true;
  return false;
};

process.on('uncaughtException', (err) => {
  if (handleSilentErrors(err)) return;
  console.error('🔥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  if (handleSilentErrors(reason)) return;
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

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

async function connectToWA() {
  if (!global.hasLoggedConsoleOnce) {
    console.log("\n⏳ Connecting SACHIYA MD ✨...");
  }

  if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
  }

  await Promise.all([loadSessionFromMongo(), loadBlockedListIntoCache()]);

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const logger = P({ level: 'silent' });

  // 🛠️ FIXED SOCKET OPTIONS & ROBUST MESSAGE STORE FOR SMOOTH DECRYPTION & REACTS
  const messageInMemoryStore = new Map();

  const sachiya = makeWASocket({
    logger,
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "120.0.6099.109"],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    syncFullHistory: false,
    fireInitQueries: true, 
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
    getMessage: async (key) => {
      const msgId = key.id;
      if (messageInMemoryStore.has(msgId)) {
        return messageInMemoryStore.get(msgId);
      }
      return { conversation: "Hello, I am SACHIYA-MD!" };
    }
  });

  if (!sachiya.authState.creds.registered) {
    let targetNumber = (config.OWNER_NUM || ownerNumber[0]).replace(/[^0-9]/g, '');
    
    if (!targetNumber) {
      console.log("❌ OWNER_NUM / Phone Number is missing in config.js!");
    } else {
      console.log(`⚠️ Requesting Pairing Code instantly for number: ${targetNumber}`);
      setTimeout(async () => {
        try {
          let code = await sachiya.requestPairingCode(targetNumber);
          code = code?.match(/.{1,4}/g)?.join("-") || code;
          console.log("\n========================================");
          console.log(`🔥 YOUR PAIRING CODE:  [  ${code}  ]`);
          console.log("========================================");
        } catch (err) {
          console.error("❌ Pairing Code generation error:", err.message || err);
        }
      }, 3000);
    }
  } else {
    if (!global.hasLoggedConsoleOnce) {
      console.log("⚡ Active Session Found! Connected successfully...");
    }
  }

  let isConnectedOnce = false;

  sachiya.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      isConnectedOnce = false;
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

      if (!global.hasLoggedConsoleOnce) {
        global.hasLoggedConsoleOnce = true;
        console.log('\n╭─────────────────────────────────────╮');
        console.log('│ SACHIYA MD CONNECTED SUCCESSFULLY!  │');
        console.log('╰─────────────────────────────────────╯\n');
      }

      await saveSessionToMongo();
      await loadBlockedListIntoCache();

      if (!global.hasSentBootMessage) {
        global.hasSentBootMessage = true;

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
    }
  });

  sachiya.ev.on('creds.update', async () => {
    await saveCreds();
    await saveSessionToMongo();
  });

  // --- AntiCall Live DB Check & Instant Block Event (Fixed for Groups) ---
  sachiya.ev.on('call', async (chats) => {
    try {
      const callDoc = await AntiCallModel.findOne({ _id: 'sachiyamd_anticall_status' });
      if (callDoc && callDoc.status === true) {
        for (const call of chats) {
          if (call.status === 'offer') {
            const callerJid = call.from;
            
            if (!callerJid || callerJid.endsWith('@g.us') || callerJid.includes('-') || call.isGroup === true || (call.chatId && call.chatId.endsWith('@g.us'))) {
              continue;
            }

            await sachiya.rejectCall(call.id, callerJid);
            await sachiya.sendMessage(callerJid, { text: "⚠️ *Calls are not allowed! Please do not call me, drop a text instead.* 🚫" });
          }
        }
      }
    } catch (e) {}
  });

  sachiya.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages ? chatUpdate.messages[0] : chatUpdate[0];
      if (!mek || !mek.message) return;

      // ⚡ ULTRA FAST FIX: Ignore old synced messages coming during bot startup loop (Prevents lag & double replies)
      const messageTimestamp = (mek.messageTimestamp ? Number(mek.messageTimestamp) * 1000 : Date.now());
      if (messageTimestamp < botStartTime - 10000) return;
      
      // Store message in memory for getMessage lookup fix (prevents decryption/waiting errors)
      if (mek.key && mek.key.id && mek.message) {
        messageInMemoryStore.set(mek.key.id, mek.message);
        if (messageInMemoryStore.size > 500) {
          const firstKey = messageInMemoryStore.keys().next().value;
          messageInMemoryStore.delete(firstKey);
        }
      }

      // --- Handle Settings Menu Multi-Replies ---
      const quotedMsg = mek.message.extendedTextMessage?.contextInfo;
      const stanzaId = quotedMsg?.stanzaId;
      
      if (stanzaId && global.activeSettingsMenus && global.activeSettingsMenus.has(stanzaId)) {
        const menuData = global.activeSettingsMenus.get(stanzaId);
        const fromMenu = menuData.from;
        const responseMessage = mek.message.conversation || mek.message.extendedTextMessage?.text || "";
        const parts = responseMessage.trim().split(/ +/);
        const featureNum = parts[0];
        const action = parts[1] ? parts[1].toLowerCase() : "";

        if (action === 'on' || action === 'off') {
          const stateBool = (action === 'on');
          let featureName = "";

          try {
            switch (featureNum) {
              case '1': {
                await AntiCallModel.findOneAndUpdate({ _id: 'sachiyamd_anticall_status' }, { status: stateBool }, { upsert: true, new: true });
                featureName = "📞 Anti-Call";
                break;
              }
              case '2': {
                await AntideleteModel.findOneAndUpdate({ _id: 'sachiyamd_antidelete_status' }, { enabled: stateBool }, { upsert: true, new: true });
                featureName = "🛡️ Anti-Delete";
                break;
              }
              case '3':
              case '4': {
                let updateObj = featureNum === '3' ? { ireact: stateBool } : { greact: stateBool };
                await AutoReactModel.findOneAndUpdate({ _id: 'sachiyamd_autoreact_settings' }, updateObj, { upsert: true, new: true });
                featureName = featureNum === '3' ? "💬 Inbox Auto-React" : "👥 Group Auto-React";
                break;
              }
              case '5': {
                await AutoReadModel.findOneAndUpdate({ _id: 'autoread_config' }, { enabled: stateBool, updatedAt: new Date() }, { upsert: true, new: true });
                featureName = "👁️‍🗨️ Auto-Read";
                break;
              }
              case '6': {
                await AutoStatusModel.findOneAndUpdate({ _id: 'sachiyamd_autostatus_settings' }, { status: stateBool }, { upsert: true, new: true });
                featureName = "💚 Auto-Status";
                break;
              }
            }
          } catch (dbErr) {
            console.error("Settings DB Update Error:", dbErr.message);
          }

          if (featureName) {
            const statusEmoji = stateBool ? "🟢 ENABLED" : "🔴 DISABLED";
            await sachiya.sendMessage(fromMenu, {
              text: `╭━━━〔 *✨ SETTINGS UPDATED ✨* 〕━━━\n` +
                    `┃\n` +
                    `┃ 📌 *Feature:* ${featureName}\n` +
                    `┃ ⚡ *New Status:* ${statusEmoji}\n` +
                    `┃ 💾 *Database:* Saved Instantly (Live ✅)\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`
            }, { quoted: mek });

            await sachiya.sendMessage(fromMenu, { react: { text: stateBool ? "✅" : "❌", key: mek.key } }).catch(() => {});
            return;
          }
        }
      }

      // --- Handle Status Broadcasts (Instant DB Check) ---
      if (mek.key && mek.key.remoteJid === 'status@broadcast') {
        try {
          const statusDoc = await AutoStatusModel.findOne({ _id: 'sachiyamd_autostatus_settings' });
          if (statusDoc && statusDoc.status === true) {
            if (typeof handleAutoStatus === 'function') {
              await handleAutoStatus(sachiya, mek);
            }
          }
        } catch (e) {}
        return;
      }

      // --- AutoRead and AutoReact Execution (Instant DB Check) ---
      try {
        if (!mek.key.fromMe) {
          const reactDoc = await AutoReactModel.findOne({ _id: 'sachiyamd_autoreact_settings' }) || await AutoReactModel.create({ _id: 'sachiyamd_autoreact_settings', ireact: true, greact: true });
          const readDoc = await AutoReadModel.findOne({ _id: 'autoread_config' });

          const isGroup = mek.key.remoteJid && mek.key.remoteJid.endsWith('@g.us');
          const canInboxReact = reactDoc.ireact !== undefined ? reactDoc.ireact : true;
          const canGroupReact = reactDoc.greact !== undefined ? reactDoc.greact : true;
          const canReact = isGroup ? canGroupReact : canInboxReact;

          if (canReact && typeof handleAutoReact === 'function') {
            await handleAutoReact(sachiya, mek).catch(() => {});
          }

          if (readDoc && readDoc.enabled === true && typeof handleAutoread === 'function') {
            await handleAutoread(sachiya, mek).catch(() => {});
          }
        }
      } catch (e) {}

      const from = mek.key.remoteJid;

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

      const rawBody = (msgType === 'conversation') ? mek.message.conversation :
                      (msgType === 'extendedTextMessage') ? mek.message.extendedTextMessage.text :
                      (msgType === 'imageMessage') ? mek.message.imageMessage.caption :
                      (msgType === 'videoMessage') ? mek.message.videoMessage.caption :
                      (mek.message?.listResponseMessage?.title) ? mek.message.listResponseMessage.title :
                      (mek.message?.buttonsResponseMessage?.selectedButtonId) ? mek.message.buttonsResponseMessage.selectedButtonId :
                      mek.text || '';
      
      const bodyText = rawBody ? String(rawBody) : '';

      if (global.blockedChatsCache && global.blockedChatsCache.includes(from)) {
          const trimmedBody = bodyText.startsWith(prefix) ? bodyText.slice(prefix.length).trim().toLowerCase() : '';
          const isAllowedCmd = trimmedBody.startsWith('block') || trimmedBody.startsWith('unblock');
          if (!isAllowedCmd) return; 
      }

      // --- Anti-Delete Message Handling (Instant DB Check) ---
      const isRevoke = mek.message?.protocolMessage && mek.message.protocolMessage.type === 0;
      if (isRevoke) {
        try {
          const deleteDoc = await AntideleteModel.findOne({ _id: 'sachiyamd_antidelete_status' });
          if (deleteDoc && deleteDoc.enabled === true) {
            await handleMessageRevocation(sachiya, mek);
          }
        } catch (e) {}
        return;
      } else {
        await storeMessage(sachiya, mek);
      }

      const m = sms(sachiya, mek);
      const quoted = m.quoted ? m.quoted : null;
      
      const body = bodyText || m.body || '';
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

      if (workMode === "private" && !isOwner) return;

      const reply = (text) => sachiya.sendMessage(from, { text }, { quoted: mek });

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
        console.error("❌ Message Upsert Error:", err);
      }
    }
  });
}

loadPlugins();
connectToWA();

app.get("/", (req, res) => {
  res.send("Hey, SACHIYA MD started successfully with MongoDB! ✅");
});

setInterval(() => {
  http.get(`http://localhost:${port}/`, () => {}).on('error', () => {});
}, 30000);

server.listen(port, () => console.log(`🚀 Server listening on http://localhost:${port}`));
