const axios = require("axios");
const { cmd } = require("../command");

function formatNumber(num) {
  return new Intl.NumberFormat().format(num.toFixed(2));
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

const currencyToCountry = {
  USD: "US",
  LKR: "LK",
  EUR: "EU",
  GBP: "GB",
  JPY: "JP",
  INR: "IN",
  AUD: "AU",
  CAD: "CA",
  SGD: "SG",
  CNY: "CN",
};

cmd(
  {
    pattern: "convert",
    alias: ["currency", "cur"],
    react: "💱",
    desc: "Convert one currency to another or get current rate",
    category: "tools",
    filename: __filename,
  },
  async (sachiya, mek, m, { args, reply }) => {
    try {
      if (!args.length || args[0] === "help") {
        return reply(
          `╭━━━〔 *✨ SACHIYA-MD CURRENCY ✨* 〕━━━\n` +
          `┃\n` +
          `┃ 🧾 *Currency Converter Help* 💱\n` +
          `┃\n` +
          `┃ 🪙 *Usage:* \`.convert <amount> <from> <to>\`\n` +
          `┃ 📌 *Example:* \`.convert 100 USD LKR\`\n` +
          `┃ 📉 *Current Rate:* \`.convert USD LKR\`\n` +
          `┃ 💡 *Supported:* USD, EUR, LKR, INR, JPY, GBP, etc.\n` +
          `┃\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `> *⚡ Powered by SACHIYA-MD 💫*`
        );
      }

      let amount = 1;
      let from, to;

      if (args.length === 2) {
        [from, to] = args;
      } else if (args.length === 3) {
        [amount, from, to] = args;
        amount = parseFloat(amount);
        if (isNaN(amount)) return reply("*❌ Invalid amount!* Must be a valid number. ⚠️");
      } else {
        return reply("*❌ Invalid command format!*\nType `.convert help` for usage instructions. ⚠️");
      }

      from = from.toUpperCase();
      to = to.toUpperCase();

      const res = await axios.get(`https://open.er-api.com/v6/latest/${from}`);
      const { rates, time_last_update_utc } = res.data;

      if (!rates[to]) return reply("*❌ Invalid target currency code! Please check again.* ⚠️");

      const converted = amount * rates[to];

      const fromFlag = currencyToCountry[from] ? getFlagEmoji(currencyToCountry[from]) : "";
      const toFlag = currencyToCountry[to] ? getFlagEmoji(currencyToCountry[to]) : "";

      reply(
        `╭━━━〔 *✨ SACHIYA-MD CONVERTER ✨* 〕━━━\n` +
        `┃\n` +
        `┃ 💱 *Currency Conversion Results* 📊\n` +
        `┃\n` +
        `┃ 🔢 *Amount:* ${formatNumber(amount)} ${fromFlag} *${from}*\n` +
        `┃ 📤 *Converted:* ${formatNumber(converted)} ${toFlag} *${to}*\n` +
        `┃ 🕰️ *Rate as of:* ${time_last_update_utc}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `> *⚡ Powered by SACHIYA-MD 💫*`
      );
    } catch (err) {
      console.error(err);
      reply("*❌ Error fetching currency rates. Please check your internet or currency codes.* ⚠️");
    }
  }
);
