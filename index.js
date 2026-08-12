const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestWaWebVersion,
  makeCacheableSignalKeyStore,
  delay
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

const { storeMessage, handleMessageRevocation } = require('./plugins/antidelete');

const app = express();
const port = process.env.PORT || 8000;

const server = http.createServer(app);

const prefix = config.PREFIX || '.';
const ownerNumber = [config.OWNER_NUM || '94760579211'];
const authFolder = path.join(__dirname, '/auth_info_baileys/');

global.blockedChatsCache = [];

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
      await mongoose.connect(config.SESSION_ID);
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
      await mongoose.connect(config.SESSION_ID);
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
      await mongoose.connect(config.SESSION_ID);
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

// 🛡️ Ultimate Console Cleaner to suppress session and decryption spam completely
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
    logText.includes('pendingPreKey') ||
    logText.includes('registrationId') ||
    logText.includes('ephemeralKeyPair') ||
    logText.includes('privKey') ||
    logText.includes('remoteIdentityKey') ||
    logText.includes('Syncing messages') ||
    logText.includes('Closing open session') ||
    logText.includes('SessionEntry')
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
    logText.includes('pendingPreKey') ||
    logText.includes('Syncing messages') ||
    logText.includes('Closing open session') ||
    logText.includes('SessionEntry')
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
  console.log("\n⏳ Connecting SACHIYA MD ✨...");

  if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
  }

  await loadSessionFromMongo();
  await loadBlockedListIntoCache();

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestWaWebVersion();
  
  const logger = P({ level: 'silent' });

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
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      console.log(`⚠️ Connection closed. Reconnecting automatically in 3 seconds...`);

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

      await saveSessionToMongo();
      await loadBlockedListIntoCache();

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

  sachiya.ev.on('call', async (callEvents) => {
    for (const call of callEvents) {
      if (call.status === 'offer') {
        const callerJid = call.from;
        try {
          await sachiya.rejectCall(call.id, callerJid);
          await sachiya.sendMessage(callerJid, { text: `අයියො CALL ගන්න එපා බන්..\nමට MASSAGE එකක් දාපන් මම Online ආපු වෙලාවට බලන්නම්..\nමෙහාට SIGNAL නෑ එකයි..\nගහක් උඩට ගිහිම් DATA ON කරපු වෙලවට බලන්නම්..\nඑක නිසා මට MASSAGE එකක් දාල තියපන් 👀` });
        } catch (e) {}
      }
    }
  });

  sachiya.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages ? chatUpdate.messages[0] : chatUpdate[0];
      if (!mek || !mek.message) return;
      if (mek.key && mek.key.remoteJid === 'status@broadcast') return;

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

      const rawBody = msgType === 'conversation' ? mek.message.conversation :
                      msgType === 'extendedTextMessage' ? mek.message.extendedTextMessage.text :
                      msgType === 'imageMessage' ? mek.message.imageMessage.caption :
                      msgType === 'videoMessage' ? mek.message.videoMessage.caption : 
                      mek.text || '';
      
      const bodyText = rawBody ? String(rawBody) : '';

      // 🛑 Instant Memory Check (Allow both .block and .unblock commands to bypass when blocked)
      if (global.blockedChatsCache && global.blockedChatsCache.includes(from)) {
          const trimmedBody = bodyText.startsWith(prefix) ? bodyText.slice(prefix.length).trim().toLowerCase() : '';
          const isAllowedCmd = trimmedBody.startsWith('block') || trimmedBody.startsWith('unblock');
          if (!isAllowedCmd) {
              return; 
          }
      }

      const isRevoke = mek.message?.protocolMessage && mek.message.protocolMessage.type === 0;
      if (isRevoke) {
        await handleMessageRevocation(sachiya, mek);
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

      if (workMode === "private" && !isOwner) {
        return;
      }

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
