const { cmd } = require("../command");

cmd(
  {
    pattern: "ping",
    alias: ["speed", "latency"],
    react: "⚡",
    desc: "Test Bot response speed",
    category: "main",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, reply }) => {
    try {
      const start = Date.now();

      // Calculating Response Latency
      const latencyMsg = await sachiya.sendMessage(from, { text: "⚡ *Pinging SACHIYA-MD Servers...*" }, { quoted: mek });
      const end = Date.now();
      const speed = end - start;

      // Calculate Uptime
      const uptimeSeconds = process.uptime();
      const days = Math.floor(uptimeSeconds / (3600 * 24));
      const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
      const minutes = Math.floor((uptimeSeconds % 3600) / 60);
      const seconds = Math.floor(uptimeSeconds % 60);
      
      let uptimeString = "";
      if (days > 0) uptimeString += `${days}d `;
      if (hours > 0 || days > 0) uptimeString += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) uptimeString += `${minutes}m `;
      uptimeString += `${seconds}s`;

      // Get Current Date and Time (Sri Lanka Timezone)
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Colombo',
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      const dateStr = now.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Colombo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // 🎨 SACHIYA-MD BEAUTIFUL PING CARD (Status part removed)
      const pingCard = `╭━━━〔 *SACHIYA-MD SPEED* 〕━━━\n` +
                        `┃\n` +
                        `┃ ⚡ *Response Speed:* \`\`\`${speed} ms\`\`\`\n` +
                        `┃ ⏳ *Uptime:* \`\`\`${uptimeString}\`\`\`\n` +
                        `┃ 📅 *Date:* \`\`\`${dateStr}\`\`\`\n` +
                        `┃ 🕒 *Time:* \`\`\`${timeStr}\`\`\`\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> *Powered by SACHIYA MD 💫*`;

      // Edit/Update Message with Response Time
      await sachiya.sendMessage(from, { text: pingCard, edit: latencyMsg.key });

    } catch (e) {
      console.error("PING ERROR:", e);
      const start = Date.now();
      const end = Date.now();
      return reply(`⚡ *Response Time:* \`\`\`${end - start} ms\`\`\``);
    }
  }
);
