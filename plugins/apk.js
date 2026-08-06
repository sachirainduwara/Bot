const { cmd } = require("../command");
const axios = require("axios");

cmd(
  {
    pattern: "apk",
    alias: ["android", "app"],
    react: "📱",
    desc: "Download Android APK by name",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { q, reply, from }) => {
    try {
      if (!q) return reply("⚠️ *Please provide an App Name! (e.g: .apk WhatsApp)*");

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      // Search APK via Aptoide API
      const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(q)}/limit=1`;
      const { data } = await axios.get(apiUrl).catch(() => null);

      if (!data || !data.datalist || !data.datalist.list || !data.datalist.list.length) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("⚠️ *No APKs found with the given name!*");
      }

      const app = data.datalist.list[0];
      const appSize = (app.size / (1024 * 1024)).toFixed(2); // Convert bytes to MB
      const downloadLink = app.file.path_alt || app.file.path;

      // 🎨 SACHIYA-MD BEAUTIFUL UI CARD
      const caption = `╭━━━〔 *SACHIYA-MD APK DL* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📱 *App Name:* ${app.name}\n` +
                      `┃ 📦 *Package:* ${app.package}\n` +
                      `┃ 👤 *Developer:* ${app.developer?.name || "Unknown"}\n` +
                      `┃ 📊 *Size:* ${appSize} MB\n` +
                      `┃ 🗓️ *Updated:* ${app.updated || "N/A"}\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                      `> *Downloading APK File... Please wait!* ⏳\n` +
                      `> Powered by SACHIYA MD 💫`;

      // 1. Send Icon & App Details
      await sachiya.sendMessage(
        from,
        {
          image: { url: app.icon },
          caption: caption,
        },
        { quoted: mek }
      );

      // 2. Send Actual APK Document
      await sachiya.sendMessage(
        from,
        {
          document: { url: downloadLink },
          fileName: `${app.name}.apk`,
          mimetype: "application/vnd.android.package-archive",
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (err) {
      console.error("❌ APK Downloader Error:", err);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("❌ *An error occurred while downloading the APK file!*");
    }
  }
);
