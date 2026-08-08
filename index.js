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

const config = require('./config');
const { sms } = require('./lib/msg');
const { commands } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = config.PREFIX || '.';
const ownerNumber = [config.OWNER_NUM || '94760579211'];
const authFolder = path.join(__dirname, '/auth_info_baileys/');

// --- Smart MongoDB Session Schema (Saves entire auth folder states cleanly) ---
const SessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sessionData: { type: Object, required: true }
});
const SessionModel = mongoose.models.Session || mongoose.model('Session', SessionSchema);

// Safe Session Loader from MongoDB without breaking inbox streams
async function loadSessionFromMongo() {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.SESSION_ID);
    }
    const doc = await SessionModel.findOne({ _id: 'sachiyamd_v2_session' });
    if (doc && doc.sessionData) {
      if (!fs.existsSync(authFolder)) {
        fs.mkdirSync(authFolder, { recursive: true });
      }
      // Restore all session files cleanly
      for (const [fileName, fileContent] of Object.entries(doc.sessionData)) {
        fs.writeFileSync(path.join(authFolder, fileName), JSON.stringify(fileContent, null, 2));
      }
      console.log("✅ Clean Session restored from MongoDB Atlas!");
    }
  } catch (e) {}
}

// Safe Session Saver to MongoDB
async function saveSessionToMongo() {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    if (!fs.existsSync(authFolder)) return;
    const files = fs.readdirSync(authFolder);
    const sessionData = {};

    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = fs.readFileSync(path.join(authFolder, file), 'utf8');
        try {
          sessionData[file] = JSON.parse(content);
        } catch (err) {}
      }
    }

    if (Object.keys(sessionData).length === 0) return;

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.SESSION_ID);
    }

    await SessionModel.findOneAndUpdate(
      { _id: 'sachiyamd_v2_session' },
      { sessionData },
      { upsert: true, new: true }
    );
  } catch (e) {}
}

// Clear Session on Logout
async function clearMongoSession() {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.SESSION_ID);
    }
    await SessionModel.deleteOne({ _id: 'sachiyamd_v2_session' });
    console.log("🗑️ MongoDB session cleared.");
  } catch (e) {}
}

// 🛡️ Ultimate Silent Error Cleaner
const originalConsoleError = console.error;
console.error = function (...args) {
  const logText = args.join(' ');
  if (
    logText.includes('Failed to decrypt message') ||
    logText.includes('Bad MAC') ||
    logText.includes('No sessions') ||
    logText.includes('closing connection') ||
    logText.includes('Closing session') ||
    logText.includes('SessionEntry') ||
    logText.includes('libsignal') ||
    logText.includes('prekey bundle')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

process.on('uncaughtException', () => {});
process.on('unhandledRejection', () => {});

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
        } catch (e) {}
      }
    });
    console.log(`✅ Loaded ${commands.length} Commands Successfully!`);
  }
}

// 2. WhatsApp Connection Logic with Real-time Inbox Fix
async function connectToWA() {
  console.log("\n⏳ Connecting SACHIYA MD ✨...");

  if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
  }

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
      return { conversation: 'Hello, I am SACHIYA-MD active bot!' };
    }
  });

  // Pairing Code Generation ONLY IF NOT REGISTERED
  if (!sachiya.authState.creds.registered) {
    let targetNumber = (config.OWNER_NUM || ownerNumber[0]).replace(/[^0-9]/g, '');
    
    if (targetNumber) {
      setTimeout(async () => {
        try {
          let code = await sachiya.requestPairingCode(targetNumber);
          code = code?.match(/.{1,4}/g)?.join("-") || code;
          console.log("\n========================================");
          console.log(`🔥 YOUR PAIRING CODE:  [  ${code}  ]`);
          console.log("========================================");
        } catch (err) {}
      }, 10000);
    }
  } else {
    console.log("⚡ Active Session Found! Connecting directly...");
  }

  let isConnectedOnce = false;

  sachiya.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      if (isConnectedOnce) return; 

      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
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
          await sachiya.sendMessage(callerJid, { text: `කෝල් ගන්න එපා අනේ! 😅\nමට මැසේජ් එකක් දාන්නකො, කෝල් ගන්න එපා.` });
        } catch (e) {}
      }
    }
  });

  // ✉️ Direct Unlocked Message Handler for Inbox & Groups
  sachiya.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages ? chatUpdate.messages[0] : chatUpdate[0];
      if (!mek || !mek.message) return;
      if (mek.key && mek.key.remoteJid === 'status@broadcast') return;

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
      
      // 🔥 CRITICAL FIX: Ensure incoming DMs/inbox JIDs never get bypassed by session state locks
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
        } catch (e) {}
      }
    } catch (err) {}
  });
}

loadPlugins();
connectToWA();

app.get("/", (req, res) => {
  res.send("Hey, SACHIYA MD started successfully! ✅");
});

app.listen(port, () => console.log(`🚀 Server listening on http://localhost:${port}`));
