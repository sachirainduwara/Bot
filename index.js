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
const { Storage } = require('megajs');

const config = require('./config');
const { sms } = require('./lib/msg');
const { commands, replyHandlers } = require('./command');

const app = express();
const port = process.env.PORT || 8000;

const prefix = config.PREFIX || '.';
const ownerNumber = [config.OWNER_NUM || '94771081150'];
const authFolder = path.join(__dirname, '/auth_info_baileys/');

// --- Mega.nz Session Store Helper ---
async function uploadCredsToMega(authDir) {
  if (!config.MEGA_EMAIL || !config.MEGA_PASSWORD) return;
  try {
    const credsPath = path.join(authDir, 'creds.json');
    if (!fs.existsSync(credsPath)) return;

    const storage = new Storage({ email: config.MEGA_EMAIL, password: config.MEGA_PASSWORD });
    await storage.ready;

    let folder = storage.root.children.find(f => f.name === 'sachiyamd_session' && f.directory);
    if (!folder) { folder = await storage.root.mkdir('sachiyamd_session'); }

    const existingFile = folder.children.find(f => f.name === 'creds.json');
    if (existingFile) { await existingFile.delete(); }

    await folder.upload('creds.json', fs.createReadStream(credsPath)).complete;
  } catch (e) { console.error("Mega Upload Error:", e); }
}

async function downloadCredsFromMega(authDir) {
  if (!config.MEGA_EMAIL || !config.MEGA_PASSWORD) return false;
  try {
    const storage = new Storage({ email: config.MEGA_EMAIL, password: config.MEGA_PASSWORD });
    await storage.ready;
    const folder = storage.root.children.find(f => f.name === 'sachiyamd_session' && f.directory);
    if (!folder) return false;
    const file = folder.children.find(f => f.name === 'creds.json');
    if (!file) return false;
    if (!fs.existsSync(authDir)) { fs.mkdirSync(authFolder, { recursive: true }); }
    const data = await file.downloadBuffer();
    fs.writeFileSync(path.join(authFolder, 'creds.json'), data);
    return true;
  } catch (e) { return false; }
}

// 2. WhatsApp Connection Logic
async function connectToWA() {
  console.log("\n⏳ Connecting SACHIYA MD...");

  if (!fs.existsSync(authFolder)) { fs.mkdirSync(authFolder, { recursive: true }); }
  await downloadCredsFromMega(authFolder);

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestWaWebVersion();
  
  const sachiya = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    // Google Chrome on Ubuntu Browser String
    browser: ["Chrome", "Chrome", "116.0.0.0"], 
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })),
    },
    version,
    syncFullHistory: false,
    generateHighQualityLinkPreview: true
  });

  // Pairing Code Logic
  if (!sachiya.authState.creds.registered) {
    let targetNumber = (config.OWNER_NUM || ownerNumber[0]).replace(/[^0-9]/g, '');
    
    // Delay requesting pairing code to ensure Socket is fully ready
    setTimeout(async () => {
      try {
        let code = await sachiya.requestPairingCode(targetNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log("\n========================================");
        console.log(`🔥 PAIRING CODE: [  ${code}  ]`);
        console.log("========================================");
      } catch (err) {
        console.error("Pairing Code Error:", err.message);
      }
    }, 8000); 
  }

  sachiya.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      if (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) {
        connectToWA();
      }
    } else if (connection === 'open') {
      console.log('✅ Connected!');
      await uploadCredsToMega(authFolder);
    }
  });

  sachiya.ev.on('creds.update', saveCreds);

  // Message Handler
  sachiya.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages[0];
      if (!mek || !mek.message) return;
      const m = sms(sachiya, mek);
      const from = mek.key.remoteJid;
      const isCmd = (m.body || '').startsWith(prefix);
      
      if (isCmd) {
        const commandName = m.body.slice(prefix.length).trim().split(" ")[0].toLowerCase();
        const cmd = commands.find((c) => c.pattern === commandName || (c.alias && c.alias.includes(commandName)));
        if (cmd) {
          await cmd.function(sachiya, mek, m, { reply: (t) => sachiya.sendMessage(from, { text: t }, { quoted: mek }) });
        }
      }
    } catch (err) { console.error(err); }
  });
}

connectToWA();
app.listen(port, () => console.log(`🚀 Server on ${port}`));
