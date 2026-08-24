const { cmd } = require("../command");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalStore } = require("@whiskeysockets/baileys");
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
    credsData: { type: Object, required: true }, // Complete session info safe storage
    status: { type: String, default: "CONNECTED" },
    createdAt: { type: Date, default: Date.now }
  });
  PairDB = mongoose.model("Pair", PairSchema);
}

cmd(
  {
    pattern: "pair",
    alias: ["code", "link"],
    react: "🔗",
    desc: "Generate WhatsApp pairing code with isolated secure session handling",
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

      // Step 2: Initializing Connection UI
      await sachiya.sendMessage(from, { 
        text: `*🔄 Initializing Connection & Generating Code...* ⏳`, 
        edit: msg.key 
      });

      // Completely isolated temporary folder for this specific user to avoid overlap
      const sessionDir = path.join(__dirname, `../temp_pair_${phoneNumber}_${Date.now()}`);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      const sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalStore(state.keys, pino({ level: "fatal" }))
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        browser: Browsers.macOS("Safari"),
      });

      if (!sock.authState.creds.registered) {
        await delay(1500);
        let pairCode = await sock.requestPairingCode(phoneNumber);
        pairCode = pairCode?.match(/.{1,4}/g)?.join("-") || pairCode;

        // Step 3: Edit message to "Generate Success!"
        await sachiya.sendMessage(from, { 
          text: `✅ *Generate Success!* 🎉\n> *Pairing code has been generated below 👇*`, 
          edit: msg.key 
        });

        await delay(500);

        // Step 4: Send clean separate message containing ONLY the code and the copy button
        await sachiya.sendMessage(from, {
          text: `*${pairCode}*`,
          buttons: [
            {
              buttonId: `copy_${pairCode}`,
              buttonText: { displayText: "Copy Pair Code ✅" },
              type: 4,
              copyCode: pairCode
            }
          ],
          headerType: 1
        });
      }

      sock.ev.on("creds.update", async () => {
        await saveCreds();
      });

      sock.ev.on("connection.update", async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === "open") {
          await delay(5000); // Wait for sync to completely finish logging in

          try {
            // Read creds file generated in the isolated session folder
            const credsPath = path.join(sessionDir, "creds.json");
            if (fs.existsSync(credsPath)) {
              const credsData = JSON.parse(fs.readFileSync(credsPath, "utf8"));

              // Save encrypted/complete user session profile into MongoDB 'pair' collection safely
              await PairDB.findOneAndUpdate(
                { userId: phoneNumber },
                { credsData: credsData, status: "CONNECTED" },
                { upsert: true, new: true }
              );

              await sachiya.sendMessage(from, { 
                text: `✅ *Successfully Connected & Saved securely to MongoDB!* 🎉\n📱 *User:* +${phoneNumber}` 
              });
            }
          } catch (dbErr) {
            console.error("DB Save Error:", dbErr);
          }

          // Clean up isolated temporary local folder safely after saving to DB
          setTimeout(() => {
            if (fs.existsSync(sessionDir)) {
              fs.rmSync(sessionDir, { recursive: true, force: true });
            }
          }, 5000);
        } else if (connection === "close") {
          // Handle reconnection if disconnected prematurely before connection opens
          const reason = lastDisconnect?.error?.output?.statusCode;
          if (reason && reason !== 440 && reason !== 401) {
            // Optional handling
          }
        }
      });

    } catch (e) {
      console.error("PAIR ERROR:", e);
      return reply("❌ *An error occurred while generating the pair code. Please try again later!* ⚠️");
    }
  }
);
