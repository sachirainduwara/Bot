const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  jidNormalizedUser,
  getContentType,
  fetchLatestWaWebVersion,
  makeCacheableSignalKeyStore
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

// --- MongoDB Session Database ---
const SessionSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  data: { type: Object, required: true }
});
const SessionModel = mongoose.models.Session || mongoose.model('Session', SessionSchema);

async function loadSessionFromMongo() {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    if (mongoose.connection.readyState === 0) await mongoose.connect(config.SESSION_ID);
    const sessionDoc = await SessionModel.findOne({ _id: 'sachiyamd_creds' });
    if (sessionDoc && sessionDoc.data) {
      if (!fs.existsSync(authFolder)) fs.mkdirSync(authFolder, { recursive: true });
      fs.writeFileSync(path.join(authFolder, 'creds.json'), JSON.stringify(sessionDoc.data, null, 2));
    }
  } catch (e) {}
}

async function saveSessionToMongo() {
  if (!config.SESSION_ID || !config.SESSION_ID.startsWith('mongodb+srv://')) return;
  try {
    const credsPath = path.join(authFolder, 'creds.json');
    if (!fs.existsSync(credsPath)) return;
    const credsData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    if (mongoose.connection.readyState === 0) await mongoose.connect(config.SESSION_ID);
    await SessionModel.findOneAndUpdate({ _id: 'sachiyamd_creds' }, { data: credsData }, { upsert: true, new: true });
  } catch (e) {}
}

// 🛡️ Error Handling
const handleSilentErrors = (err) => {
  if (!err) return true;
  const msg = err.message || err.toString() || "";
  const ignored = ['Failed to decrypt', 'Bad MAC', 'No sessions', 'libsignal', 'JSON', 'closed', 'connection'];
  return ignored.some(i => msg.includes(i));
};

process.on('uncaughtException', (err) => { if (!handleSilentErrors(err)) console.error('Uncaught Exception:', err); });
process.on('unhandledRejection', (err) => { if (!handleSilentErrors(err)) console.error('Unhandled Rejection:', err); });

function loadPlugins() {
  let pluginsPath = path.join(__dirname, "plugins");
  if (fs.existsSync(pluginsPath)) {
    fs.readdirSync(pluginsPath).forEach((plugin) => {
      if (plugin.endsWith(".js")) {
        try { require(path.join(pluginsPath, plugin)); } catch (e) { console.error(`Plugin ${plugin} Error:`, e.message); }
      }
    });
    console.log(`✅ Loaded ${commands.length} Commands!`);
  }
}

async function connectToWA() {
  console.log("\n⏳ Connecting SACHIYA MD...");
  await loadSessionFromMongo();

  const { state, saveCreds } = await useMultiFileAuthState(authFolder);
  const { version } = await fetchLatestWaWebVersion();
  
  const sachiya = makeWASocket({
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
    version,
    browser: ["Ubuntu", "Chrome", "120.0.6099.109"]
  });

  if (!sachiya.authState.creds.registered) {
    setTimeout(async () => {
      try {
        let code = await sachiya.requestPairingCode(config.OWNER_NUM || '94760579211');
        console.log(`\n🔥 YOUR PAIRING CODE: [ ${code} ]\n`);
      } catch (err) { console.error("Pairing Error:", err.message); }
    }, 5000);
  }

  sachiya.ev.on('connection.update', async (update) => {
    const { connection } = update;
    if (connection === 'close') connectToWA();
    else if (connection === 'open') {
      console.log('✅ Connected Successfully!');
      await saveSessionToMongo();
    }
  });

  sachiya.ev.on('creds.update', async () => { await saveCreds(); await saveSessionToMongo(); });

  sachiya.ev.on('messages.upsert', async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages[0];
      if (!mek.message) return;
      let msgType = getContentType(mek.message);
      
      // Fix: Correctly update msgType
      if (msgType === 'ephemeralMessage' || msgType === 'viewOnceMessage' || msgType === 'viewOnceMessageV2') {
        mek.message = mek.message[msgType].message;
        msgType = getContentType(mek.message);
      }

      const m = sms(sachiya, mek);
      const body = (msgType === 'conversation') ? mek.message.conversation : (msgType === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (msgType === 'imageMessage') ? mek.message.imageMessage.caption : '';
      
      if (!body.startsWith(prefix)) return;

      const args = body.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      const cmd = commands.find(c => c.pattern === commandName || (c.alias && c.alias.includes(commandName)));
      
      if (cmd) {
        await cmd.function(sachiya, mek, m, {
          from: mek.key.remoteJid,
          args,
          reply: (text) => sachiya.sendMessage(mek.key.remoteJid, { text }, { quoted: mek })
        });
      }
    } catch (err) {}
  });
}

loadPlugins();
connectToWA();
app.listen(port, () => console.log(`🚀 Server on port ${port}`));
