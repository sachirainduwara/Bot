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

      // 🔍 Search APK via Aptoide API (with encode and error handling)
      const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(q)}/limit=1`;
      const response = await axios.get(apiUrl).catch(() => null);
      const data = response?.data;

      if (!data || !data.datalist || !data.datalist.list || !data.datalist.list.length) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("⚠️ *No APKs found with the given name!*");
      }

      const app = data.datalist.list[0];
      
      // Safe size calculation (avoid NaN if size is missing)
      const appSize = app.size ? (app.size / (1024 * 1024)).toFixed(2) : "Unknown";
      const downloadLink = app.file?.path_alt || app.file?.path;

      if (!downloadLink) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Download link not available for this app!*");
      }

      // 🎨 SACHIYA-MD BEAUTIFUL UI CARD
      const caption = `╭━━━〔 *SACHIYA-MD APK DL* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📱 *App Name:* ${app.name || "Unknown"}\n` +
                      `┃ 📦 *Package:* ${app.package || "N/A"}\n` +
                      `┃ 👤 *Developer:* ${app.developer?.name || "Unknown"}\n` +
                      `┃ 📊 *Size:* ${appSize} MB\n` +
                      `┃ 🗓️ *Updated:* ${app.updated || "N/A"}\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                      `> *Downloading APK File... Please wait!* ⏳\n` +
                      `> Powered by SACHIYA MD 💫`;

      // 1. Send Icon & App Details Card
      await sachiya.sendMessage(
        from,
        {
          image: { url: app.icon || config.ALIVE_IMG },
          caption: caption,
        },
        { quoted: mek }
      );

      // 2. Send Actual APK Document File
      const safeFileName = (app.name || "app").replace(/[^\w\s]/gi, '');
      await sachiya.sendMessage(
        from,
        {
          document: { url: downloadLink },
          fileName: `${safeFileName}.apk`,
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
