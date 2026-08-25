const { cmd } = require("../command");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// --- MongoDB Schema & Model ---
let PairDB;
try {
  PairDB = mongoose.model("Pair");
} catch {
  const PairSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    creds: { type: Object }, // Store full session creds for stable connection
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
    desc: "Generate WhatsApp pairing code with edit status and separate clean code message",
    category: "owner",
    use: ".pair <phone number>",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply, isOwner }) => {
    try {
      // 1. Owner Only List & Remove Commands
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

      // 2. Main Pairing Input Validation
      if (!q) {
        return reply(
          `╭━━━〔 *✨ SACHIYA-MD PAIR SYSTEM ✨* 〕━━━\n` +
          `┃\n` +
          `┃ ⚠️ *Please provide your WhatsApp number with country code!*\n` +
          `┃ 📌 *Example:* \`.pair 94762566232\`\n` +
          `┃\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `> *⚡ Powered by SACHIYA-MD 💫*`
        );
      }

      let phoneNumber = q.replace(/[^0-9]/g, "").trim();
      if (phoneNumber.length < 10) {
        return reply("❌ *Invalid phone number! Please include your country code (e.g., 9476xxxxxxx).*");
      }

      // Step 1: Number Checking UI
      let msg = await sachiya.sendMessage(from, { 
        text: `*🔍 Number Checking:* \`+${phoneNumber}\` ... Please wait! ⏳` 
      }, { quoted: mek });

      await delay(1200);

      // Step 2: Initializing Connection UI (Editing same message)
      await sachiya.sendMessage(from, { 
        text: `*🔄 Initializing Connection & Generating Code...* ⏳`, 
        edit: msg.key 
      });

      // Temporary Auth Directory for Session
      const tempId = `temp_${phoneNumber}_${Date.now()}`;
      const sessionDir = path.join(__dirname, `../temp_sessions/${tempId}`);

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
      const logger = pino({ level: "fatal" });

      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: false,
        logger: logger,
        browser: Browsers.macOS("Safari"),
      });

      sock.ev.on("creds.update", saveCreds);

      if (!sock.authState.creds.registered) {
        await delay(1500);
        let pairCode = await sock.requestPairingCode(phoneNumber);
        pairCode = pairCode?.match(/.{1,4}/g)?.join("-") || pairCode;

        // Step 3: Edit original message to "Generate Success!"
        await sachiya.sendMessage(from, { 
          text: `✅ *Generate Success!* 🎉\n> *Pairing code has been generated below 👇*`, 
          edit: msg.key 
        });

        await delay(500);

        // Step 4: Send a completely separate message containing ONLY the code
        await sachiya.sendMessage(from, {
          text: `*${pairCode}*`
        });
      }

      sock.ev.on("connection.update", async (update) => {
        const { connection } = update;
        if (connection === "open") {
          await delay(3000);
          
          // Read creds.json securely and save to MongoDB so bot can reuse it
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
            text: `✅ *Successfully Connected & Saved Session to MongoDB!* 🎉\n📱 *User:* +${phoneNumber}\n\n> *Restart your bot to activate this session.*` 
          });

          // Clean up temp session files
          if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }
        }
      });

    } catch (e) {
      console.error("PAIR ERROR:", e);
      return reply("❌ *An error occurred while generating the pair code. Please try again later!* ⚠️");
    }
  }
);
