const { cmd } = require("../command");
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

let PairDB;
try {
  PairDB = mongoose.model("PairSession");
} catch {
  const PairSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    creds: { type: Object },
    status: { type: String, default: "PENDING" },
    createdAt: { type: Date, default: Date.now }
  });
  PairDB = mongoose.model("PairSession", PairSchema);
}

cmd(
  {
    pattern: "pair",
    alias: ["code", "link"],
    react: "🔗",
    desc: "Generate WhatsApp pairing code securely",
    category: "owner",
    use: ".pair <phone number>",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply, isGroup }) => {
    try {
      if (isGroup) {
        return reply("❌ *Please use this command in my Inbox (Direct Message) for security reasons!* 📩");
      }

      if (!q) {
        return reply(
          `╭━━━〔 *✨ SACHIYA-MD PAIR SYSTEM ✨* 〕━━━\n` +
          `┃\n` +
          `┃ ⚠️ *Please provide your WhatsApp number with country code!*\n` +
          `┃ 📌 *Example:* \`.pair 94762566232\`\n` +
          `┃\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        );
      }

      let phoneNumber = q.replace(/[^0-9]/g, "").trim();
      if (phoneNumber.length < 10) {
        return reply("❌ *Invalid phone number! Include country code (e.g., 9476xxxxxxx).*");
      }

      let msg = await sachiya.sendMessage(from, { 
        text: `*🔍 Checking number:* \`+${phoneNumber}\` ... Please wait! ⏳` 
      }, { quoted: mek });

      await delay(2000);

      await sachiya.sendMessage(from, { 
        text: `*🔄 Initializing Mobile Safari Handshake...* ⏳`, 
        edit: msg.key 
      });

      const sessionDir = path.join(__dirname, `../temp_user_${phoneNumber}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const logger = pino({ level: "silent" });

      // 🛠️ Using Safari / Mac OS signature to bypass WhatsApp Web rejection errors
      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: false,
        logger: logger,
        browser: ["Mac OS", "Safari", "17.2.1"], 
        markOnlineOnConnect: true,
        syncFullHistory: false
      });

      sock.ev.on("creds.update", saveCreds);

      if (!sock.authState.creds.registered) {
        await delay(5000);
        
        let pairCode = await sock.requestPairingCode(phoneNumber);
        pairCode = pairCode?.match(/.{1,4}/g)?.join("-") || pairCode;

        await sachiya.sendMessage(from, { 
          text: `✅ *Pairing Code Generated Successfully!* 🎉\n> *Copy the code below and link your device:*`, 
          edit: msg.key 
        });

        await delay(1000);

        await sachiya.sendMessage(from, {
          text: `*${pairCode}*`
        });
      }

      sock.ev.on("connection.update", async (update) => {
        const { connection } = update;
        
        if (connection === "open") {
          await delay(6000);
          
          const credsPath = path.join(sessionDir, "creds.json");
          let parsedCreds = null;
          if (fs.existsSync(credsPath)) {
            try {
              parsedCreds = JSON.parse(fs.readFileSync(credsPath, "utf8"));
            } catch (err) {}
          }

          if (parsedCreds) {
            await PairDB.findOneAndUpdate(
              { userId: phoneNumber },
              { creds: parsedCreds, status: "CONNECTED" },
              { upsert: true, new: true }
            );
          }

          await sachiya.sendMessage(from, { 
            text: `✅ *WhatsApp Account Linked Successfully!* 🎉\n📱 *Number:* +${phoneNumber}\n\n> *Your session is now safely stored in the MongoDB database!*` 
          });

          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }
        }
      });

    } catch (e) {
      console.error("PAIR ERROR:", e);
      return reply("❌ *Failed to generate pairing code. Please check your number or try again later.* ⚠️");
    }
  }
);
