const { cmd } = require("../command");
const { default: makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

let PairDB;
try {
  PairDB = mongoose.model("Pair");
} catch {
  const PairSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    creds: { type: Object },
    status: { type: String, default: "PENDING" },
    createdAt: { type: Date, default: Date.now }
  });
  PairDB = mongoose.model("Pair", PairSchema);
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
  async (sachiya, mek, m, { from, q, reply, isOwner }) => {
    try {
      if (q === "list") {
        if (!isOwner) return reply("❌ *This command is only for the Owner!* 🚫");
        const allPairs = await PairDB.find({});
        if (allPairs.length === 0) return reply("📭 *No paired users found in database.*");
        
        let listText = `╭━━━〔 *📋 PAIRED USERS LIST* 〕━━━\n┃\n`;
        allPairs.forEach((p, index) => {
          listText += `┃ *${index + 1}.* 📱 wa.me/${p.userId} \n`;
          listText += `┃ 📌 *Status:* ${p.status}\n┃\n`;
        });
        listText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        return reply(listText);
      }

      if (q && q.startsWith("remove ")) {
        if (!isOwner) return reply("❌ *This command is only for the Owner!* 🚫");
        const targetNum = q.replace("remove ", "").trim();
        await PairDB.deleteOne({ userId: targetNum });
        return reply(`✅ *Successfully removed ${targetNum} from Pair Database!*`);
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

      await delay(1000);

      await sachiya.sendMessage(from, { 
        text: `*🔄 Initializing Stable Pairing Engine...* ⏳`, 
        edit: msg.key 
      });

      const sessionDir = path.join(__dirname, `../auth_code_${phoneNumber}`);
      if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const logger = pino({ level: "silent" });

      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: false,
        logger: logger,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        markOnlineOnConnect: true,
        syncFullHistory: false
      });

      sock.ev.on("creds.update", saveCreds);

      if (!sock.authState.creds.registered) {
        await delay(3000);
        let pairCode = await sock.requestPairingCode(phoneNumber);
        pairCode = pairCode?.match(/.{1,4}/g)?.join("-") || pairCode;

        await sachiya.sendMessage(from, { 
          text: `✅ *Pairing Code Generated Successfully!* 🎉\n> *Copy the code below and link your device:*`, 
          edit: msg.key 
        });

        await delay(500);

        await sachiya.sendMessage(from, {
          text: `*${pairCode}*`
        });
      }

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "open") {
          await delay(3000);
          
          const credsPath = path.join(sessionDir, "creds.json");
          let parsedCreds = null;
          if (fs.existsSync(credsPath)) {
            try {
              parsedCreds = JSON.parse(fs.readFileSync(credsPath, "utf8"));
            } catch (err) {}
          }

          await PairDB.findOneAndUpdate(
            { userId: phoneNumber },
            { creds: parsedCreds, status: "CONNECTED" },
            { upsert: true, new: true }
          );

          await sachiya.sendMessage(from, { 
            text: `✅ *WhatsApp Account Linked Successfully!* 🎉\n📱 *Number:* +${phoneNumber}\n\n> *Session saved to Database. Restart your bot now!*` 
          });

          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }
        } else if (connection === "close") {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          // Handle 515 restart required or normal drop during pairing handshake
          if (statusCode === DisconnectReason.restartRequired) {
            console.log("Restart required during pairing, handling seamlessly...");
          }
        }
      });

    } catch (e) {
      console.error("PAIR ERROR:", e);
      return reply("❌ *Failed to generate pairing code. Please check your number or try again later.* ⚠️");
    }
  }
);
