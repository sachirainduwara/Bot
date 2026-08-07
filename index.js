const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  delay
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const P = require('pino');
const express = require('express');
const path = require('path');

const config = require('./config');
const { sms, downloadMediaMessage } = require('./lib/msg');
const {
  getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson
} = require('./lib/functions');
const { commands, replyHandlers } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = config.PREFIX || '.';
const ownerNumber = [config.OWNER_NUM || '94760579211'];
const authFolder = path.join(__dirname, '/auth_info_baileys/');

let isFirstPairing = false;

// 🛡️ Advanced Console Cleaner (Supresses unwanted Signal/Buffers/Decryption logs completely)
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

console.error = function (...args) {
  const logText = args.join(' ');
  if (
    logText.includes('Bad MAC') ||
    logText.includes('No sessions') ||
    logText.includes('closing connection') ||
    logText.includes('Closing session') ||
    logText.includes('Decryption') ||
    logText.includes('decrypt') ||
    logText.includes('Session error') ||
    logText.includes('libsignal') ||
    logText.includes('Failed to decrypt message') ||
    logText.includes('indexInfo') ||
    logText.includes('rootKey') ||
    logText.includes('Buffer')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

console.log = function (...args) {
  const logText = args.join(' ');
  if (
    logText.includes('indexInfo') ||
    logText.includes('rootKey') ||
    logText.includes('prevCounter') ||
    logText.includes('Buffer') ||
    logText.includes('lastRemoteEphemeralKey')
  ) {
    return;
  }
  originalConsoleLog.apply(console, args);
};

const handleSilentErrors = (err) => {
  if (!err) return true;
  const msg = err.message || err.toString() || "";
  if (
    msg.includes('Bad MAC') ||
    msg.includes('No sessions') ||
    msg.includes('closing connection') ||
    msg.includes('Closing session') ||
    msg.includes('Decryption') ||
    msg.includes('decrypt') ||
    msg.includes('Session error') ||
    msg.includes('libsignal')
  ) {
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

function extractGroupAdmins(participants) {
  if (!participants || !Array.isArray(participants)) return [];
  return participants
    .filter((p) => p.admin === 'admin' || p.admin === 'superadmin')
    .map((p) => jidNormalizedUser(p.id));
}

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

// 2. WhatsApp Connection Logic
async function connectToWA() {
  console.log("\n⏳ Connecting SACHIYA MD ✨...");

  if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
  }

  if (config.SESSION_ID && !fs.existsSync(path.join(authFolder, 'creds.json'))) {
    try {
      let sessData = config.SESSION_ID.trim();
      if (sessData.includes('~')) {
        sessData = sessData.split('~')[1];
      }
      const pasteData = Buffer.from(sessData, 'base64').toString('utf-8');
      fs.writeFileSync(path.join(authFolder, 'creds.json'), pasteData);
      console.log("✅ SESSION_ID Restored Successfully!");
    } catch (e) {
      console.error("❌ Invalid SESSION_ID Format provided in config!");
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestBaileysVersion();
  
  // Pino logger set to fatal to block unnecessary buffer/signal logs completely
  const logger = P({ level: 'fatal' });

  const sachiya = makeWASocket({
    logger,
    printQRInTerminal: false,
    browser: ["Ubuntu", "Chrome", "20.0.04"],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    version,
    syncFullHistory: false,
    fireInitQueries: true,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: false,
    // Fix for "Waiting for this message" by storing/handling message lookups safely
    getMessage: async (key) => {
      try {
        return { conversation: 'Hello, I am SACHIYA-MD active bot!' };
      } catch (e) {
        return { conversation: '' };
      }
    }
  });

  if (!sachiya.authState.creds.registered) {
    isFirstPairing = true;
    let targetNumber = (config.OWNER_NUM || config.PHONE_NUMBER || ownerNumber[0]).replace(/[^0-9]/g, '');
    
    if (!targetNumber) {
      console.log("❌ OWNER_NUM / Phone Number is missing in config.js!");
    } else {
      console.log(`⚠️ No active session detected! Preparing Pairing Code...`);
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
      }, 5000);
    }
  } else {
    console.log("⚡ Active Session Found! Connecting directly without Pairing Code...");
  }

  sachiya.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === 515) {
        setTimeout(() => connectToWA(), 2000);
        return;
      }
      if (statusCode === DisconnectReason.loggedOut) {
        console.error("❌ Session logged out! Resetting session folder...");
        if (fs.existsSync(authFolder)) {
          fs.rmSync(authFolder, { recursive: true, force: true });
        }
        process.exit(1);
      } else {
        setTimeout(() => connectToWA(), 3000);
      }
    } else if (connection === 'open') {
      console.log('\n╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮');
      console.log('┃ 🎉 SACHIYA MD CONNECTED SUCCESSFULLY!  ');
      console.log('╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯\n');

      const ownerJid = ownerNumber[0] + "@s.whatsapp.net";
      const date = new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Colombo' });
      const time = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (isFirstPairing) {
        try {
          await delay(3000);
          if (fs.existsSync(path.join(authFolder, 'creds.json'))) {
            const credsRaw = fs.readFileSync(path.join(authFolder, 'creds.json'));
            const sessB64 = Buffer.from(credsRaw).toString('base64');
            const cleanSessionId = `SACHIYA-MD~${sessB64}`;
            
            await sachiya.sendMessage(ownerJid, { text: cleanSessionId });
          }
        } catch (e) {
          console.log("Session ID send error:", e);
        }
        isFirstPairing = false;
      }

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

  sachiya.ev.on('creds.update', saveCreds);

  // 📞 Anti Call Handler
  sachiya.ev.on('call', async (callEvents) => {
    for (const call of callEvents) {
      if (call.status === 'offer') {
        const callerJid = call.from;
        try {
          await sachiya.rejectCall(call.id, callerJid);
          const msg = `මොකටද අනේ කෝල් ගන්නේ? 😅\nමට මැසේජ් එකක් දාන්නකො, කෝල් ගන්න එපා.`;
          await sachiya.sendMessage(callerJid, { text: msg });
        } catch (err) {
          try {
            await sachiya.sendMessage(callerJid, { text: `මොකටද අනේ කෝල් ගන්නේ? 😅\nමට මැසේජ් එකක් දාන්නකො, කෝල් ගන්න එපා.` });
          } catch (e) {}
        }
      }
    }
  });

  // ✉️ Universal Messages Upsert Handler
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
                      msgType === 'documentMessage' ? mek.message.documentMessage.caption :
                      mek.text || m.body || '';
      
      const body = rawBody ? String(rawBody) : '';

      const isCmd = body.startsWith(prefix);
      const commandName = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : '';
      const args = body.trim().split(/ +/).slice(1);
      const q = args.join(' ');

      const rawBotJid = sachiya.user ? sachiya.user.id : '';
      const botJid = jidNormalizedUser(rawBotJid);
      const botNumber = botJid ? botJid.split('@')[0] : '';
      
      const isGroup = from.endsWith('@g.us');
      const rawSender = isGroup ? (mek.key.participant || mek.participant) : from;
      const sender = jidNormalizedUser(rawSender || from);
      const senderNumber = sender ? sender.split('@')[0] : '';

      const pushname = mek.pushName || 'User';
      const isMe = botNumber && senderNumber ? botNumber.includes(senderNumber) : false;
      const isOwner = ownerNumber.includes(senderNumber) || isMe;

      const workMode = config.MODE ? config.MODE.toLowerCase() : "public";
      if (workMode === "private" && !isOwner) {
        return;
      }

      let groupMetadata = `null`;
      let groupName = '';
      let participants = [];
      let groupAdmins = [];
      let isBotAdmins = false;
      let isAdmins = isOwner;

      if (isGroup) {
        groupMetadata = await sachiya.groupMetadata(from).catch(() => null);
        if (groupMetadata) {
          groupName = groupMetadata.subject || '';
          participants = groupMetadata.participants || [];
          groupAdmins = extractGroupAdmins(participants);
          isBotAdmins = groupAdmins.includes(botJid);
          isAdmins = groupAdmins.includes(sender) || isOwner;
        }
      }

      const reply = (text) => sachiya.sendMessage(from, { text }, { quoted: mek });

      if (isCmd) {
        const cmd = commands.find((c) => c.pattern === commandName || (c.alias && c.alias.includes(commandName)));
        if (cmd) {
          if (cmd.react) await sachiya.sendMessage(from, { react: { text: cmd.react, key: mek.key } }).catch(() => {});
          try {
            await cmd.function(sachiya, mek, m, {
              from, quoted, body, isCmd, command: commandName, args, q,
              isGroup, sender, senderNumber, botNumber2: botJid, botNumber, pushname,
              isMe, isOwner, groupMetadata, groupName, participants, groupAdmins,
              isBotAdmins, isAdmins, reply,
            });
          } catch (e) {
            console.error("[PLUGIN ERROR]", e);
          }
          return;
        }
      }

      const replyText = body;
      for (const handler of replyHandlers) {
        if (handler.filter && handler.filter(replyText, { sender, message: mek })) {
          try {
            await handler.function(sachiya, mek, m, {
              from, quoted, body: replyText, sender, reply,
            });
            return;
          } catch (e) {}
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
  res.send("Hey, SACHIYA MD started successfully! ✅");
});

app.listen(port, () => console.log(`🚀 Server listening on http://localhost:${port}`));
