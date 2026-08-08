const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestBaileysVersion,
  Browsers,
  delay
} = require('@whiskeysockets/baileys');

const fs = require('fs');
const P = require('pino');
const express = require('express');
const axios = require('axios');
const path = require('path');
const pino = require('pino');

const config = require('./config');
const { sms, downloadMediaMessage } = require('./lib/msg');
const {
  getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson
} = require('./lib/functions');
const { commands, replyHandlers } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = '.';
const ownerNumber = ['94760579211']; // Updated owner number
const credsPath = path.join(__dirname, '/auth_info_baileys/creds.json');

// Helper to format date & time nicely
function getDateTime() {
  const date = new Date().toLocaleDateString('en-GB');
  const time = new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Colombo' });
  return { date, time };
}

async function connectToWA() {
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, '/auth_info_baileys/'));
  const { version } = await fetchLatestBaileysVersion();

  console.log("Connecting SACHIYA-MD 🧬...");

  const sachiya = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: Browsers.macOS("Chrome"),
    auth: state,
    version,
    syncFullHistory: true,
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
  });

  // Pairing code logic if session is not available
  if (!sachiya.authState.creds.registered) {
    if (config.PHONE_NUMBER) {
      await delay(1500);
      let phoneNumber = config.PHONE_NUMBER.replace(/[^0-9]/g, '');
      let code = await sachiya.requestPairingCode(phoneNumber);
      code = code?.match(/.{1,4}/g)?.join("-") || code;
      console.log(`\n==================================================`);
      console.log(`✨ YOUR PAIRING CODE FOR SACHIYA-MD ✨: ${code}`);
      console.log(`==================================================\n`);
    } else {
      console.log("⚠️ No PHONE_NUMBER provided in config for pairing code! Bot will try to run with existing session.");
    }
  }

  sachiya.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      if (reason !== DisconnectReason.loggedOut) {
        connectToWA();
      } else {
        console.log("❌ Device logged out. Please delete auth_info_baileys and restart.");
        if (fs.existsSync(credsPath)) fs.unlinkSync(credsPath);
      }
    } else if (connection === 'open') {
      console.log('✅ SACHIYA-MD connected to WhatsApp successfully!');
      
      // Generate Session ID string from creds file to send to inbox
      try {
        if (fs.existsSync(credsPath)) {
          const credsData = fs.readFileSync(credsPath, 'utf8');
          // Simple base64 encoding of creds to act as a permanent Session ID
          const encodedSession = Buffer.from(credsData).toString('base64');
          const sessionIdFinal = `SACHIYA-MD;;;${encodedSession}`;
          
          const { date, time } = getDateTime();
          const successMsg = 
            `*✨ SACHIYA-MD CONNECTED SUCCESSFULLY! ✨*\n\n` +
            `┏ 📂 *Bot Name:* SACHIYA MD ✨\n` +
            `┃ 📞 *Owner Number:* 94760579211\n` +
            `┃ 📅 *Date:* ${date}\n` +
            `┃ ⏰ *Time:* ${time}\n` +
            `┃ ⚡ *Prefix:* ${prefix}\n` +
            `┗━ 🔗 *Status:* ONLINE & ACTIVE ✅\n\n` +
            `*🔐 YOUR SESSION ID:* \n\`\`\`${sessionIdFinal}\`\`\`\n\n` +
            `_Copy this Session ID and put it in your config.js! Keep it safe and do not share._`;

          await sachiya.sendMessage(ownerNumber[0] + "@s.whatsapp.net", {
            image: { url: `https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true` },
            caption: successMsg
          });
        }
      } catch (err) {
        console.error("Error generating session ID on connect:", err);
      }

      // Load Plugins safely
      if (fs.existsSync("./plugins/")) {
        fs.readdirSync("./plugins/").forEach((plugin) => {
          if (path.extname(plugin).toLowerCase() === ".js") {
            try {
              require(`./plugins/${plugin}`);
            } catch (e) {
              console.error(`Error loading plugin ${plugin}:`, e);
            }
          }
        });
      }
    }
  });

  sachiya.ev.on('creds.update', saveCreds);

  // Anticall Feature Implementation
  sachiya.ev.on('call', async (json) => {
    try {
      const anticallStatus = config.ANTICALL || 'true'; // Default enabled, can control via config
      if (anticallStatus === 'true') {
        for (const id of json) {
          if (id.status === 'offer') {
            await sachiya.rejectCall(id.id, id.from);
            await sachiya.sendMessage(id.from, { 
              text: '```📞 call ganna epa ane massage ekak daannako kiyal! Automatic Call Reject System 🤖```' 
            });
          }
        }
      }
    } catch (e) {
      console.error("Anticall error:", e);
    }
  });

  sachiya.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.messageStubType === 68) {
        await sachiya.sendMessageAck(msg.key);
      }
    }

    const mek = messages[0];
    if (!mek || !mek.message) return;

    mek.message = getContentType(mek.message) === 'ephemeralMessage' ? mek.message.ephemeralMessage.message : mek.message;
    if (mek.key.remoteJid === 'status@broadcast') return;

    const m = sms(sachiya, mek);
    const type = getContentType(mek.message);
    const from = mek.key.remoteJid;
    const body = type === 'conversation' ? mek.message.conversation : mek.message[type]?.text || mek.message[type]?.caption || '';
    const isCmd = body.startsWith(prefix);
    const commandName = isCmd ? body.slice(prefix.length).trim().split(" ")[0].toLowerCase() : '';
    const args = body.trim().split(/ +/).slice(1);
    const q = args.join(' ');

    const sender = mek.key.fromMe ? sachiya.user.id : (mek.key.participant || mek.key.remoteJid);
    const senderNumber = sender.split('@')[0];
    const isGroup = from.endsWith('@g.us');
    const botNumber = sachiya.user.id.split(':')[0];
    const pushname = mek.pushName || 'Sin Nombre';
    const isMe = botNumber.includes(senderNumber);
    const isOwner = ownerNumber.includes(senderNumber) || isMe;
    const botNumber2 = await jidNormalizedUser(sachiya.user.id);

    const groupMetadata = isGroup ? await sachiya.groupMetadata(from).catch(() => {}) : '';
    const groupName = isGroup ? groupMetadata.subject : '';
    const participants = isGroup ? groupMetadata.participants : '';
    const groupAdmins = isGroup ? await getGroupAdmins(participants) : '';
    const isBotAdmins = isGroup ? groupAdmins.includes(botNumber2) : false;
    const isAdmins = isGroup ? groupAdmins.includes(sender) : false;

    const reply = (text) => sachiya.sendMessage(from, { text }, { quoted: mek });

    if (isCmd) {
      const cmd = commands.find((c) => c.pattern === commandName || (c.alias && c.alias.includes(commandName)));
      if (cmd) {
        if (cmd.react) sachiya.sendMessage(from, { react: { text: cmd.react, key: mek.key } });
        try {
          cmd.function(sachiya, mek, m, {
            from, quoted: mek, body, isCmd, command: commandName, args, q,
            isGroup, sender, senderNumber, botNumber2, botNumber, pushname,
            isMe, isOwner, groupMetadata, groupName, participants, groupAdmins,
            isBotAdmins, isAdmins, reply,
          });
        } catch (e) {
          console.error("[PLUGIN ERROR]", e);
        }
      }
    }

    const replyText = body;
    for (const handler of replyHandlers) {
      if (handler.filter(replyText, { sender, message: mek })) {
        try {
          await handler.function(sachiya, mek, m, {
            from, quoted: mek, body: replyText, sender, reply,
          });
          break;
        } catch (e) {
          console.log("Reply handler error:", e);
        }
      }
    }
  });
}

// Session string decoder support if passed via config.SESSION_ID
function checkAndCreateSession() {
  if (config.SESSION_ID && !fs.existsSync(credsPath)) {
    try {
      console.log("🔄 Restoring session from config.SESSION_ID...");
      let sessdata = config.SESSION_ID;
      if (sessdata.startsWith("SACHIYA-MD;;;")) {
        sessdata = sessdata.replace("SACHIYA-MD;;;", "");
      }
      const decodedData = Buffer.from(sessdata, 'base64').toString('utf8');
      fs.mkdirSync(path.join(__dirname, '/auth_info_baileys/'), { recursive: true });
      fs.writeFileSync(credsPath, decodedData);
      console.log("✅ Session restored successfully from config!");
    } catch (e) {
      console.error("❌ Failed to parse SESSION_ID from config:", e);
    }
  }
  connectToWA();
}

checkAndCreateSession();

app.get("/", (req, res) => {
  res.send("Hey, SACHIYA-MD started successfully ✅");
});

app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
