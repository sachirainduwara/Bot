const { cmd } = require("../command");
const axios = require("axios");

cmd(
  {
    pattern: "gptimage",
    alias: ["aiimage", "dalle", "genimg", "gptimg"],
    react: "🎨",
    desc: "Generate stunning AI images using CometAPI (GPT-Image-2)",
    category: "ai",
    use: ".gptimage <your prompt>",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply, isGroup }) => {
    try {
      if (!q) {
        return reply(
          `╭━━━〔 *✨ GPT IMAGE GENERATOR ✨* 〕━━━\n` +
          `┃\n` +
          `┃ ⚠️ *Please provide a text prompt to generate an image!*\n` +
          `┃ 📌 *Example:* \`.gptimage A cute baby sea otter\`\n` +
          `┃\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `> *⚡ Powered by SACHIYA-MD 💫*`
        );
      }

      // 1. Initial waiting message with UI formatting
      let waitMsg = await sachiya.sendMessage(from, { 
        text: `⏳ *Generating AI Image for:* \`"${q}"\` ... Please wait! 🎨` 
      }, { quoted: mek });

      // 2. CometAPI Request using the provided API Key
      const apiKey = "fgnr5mBdMPOo9zgaDQIuz0M0cB1VRl2LwU5HOwEInDzgOQBk";
      
      const response = await axios.post(
        "https://api.cometapi.com/v1/images/generations",
        {
          model: "gpt-image-2",
          prompt: q,
          size: "1024x1024",
          response_format: "b64_json"
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          timeout: 60000 // 60 seconds timeout for high quality rendering
        }
      );

      const imageData = response.data?.data?.[0]?.b64_json;

      if (!imageData) {
        return await sachiya.sendMessage(from, { 
          text: `❌ *Error: Failed to retrieve image data from CometAPI server.* ⚠️`, 
          edit: waitMsg.key 
        });
      }

      // 3. Convert Base64 to Buffer for WhatsApp image sending
      const imageBuffer = Buffer.from(imageData, "base64");

      // 4. Beautiful UI Caption Design
      const imageCaption = `╭━━━〔 *✨ GPT AI IMAGE GENERATOR ✨* 〕━━━\n` +
                           `┃\n` +
                           `┃ 🔍 *Prompt:* ${q}\n` +
                           `┃ 🤖 *Model:* gpt-image-2\n` +
                           `┃ 🌐 *Provider:* CometAPI\n` +
                           `┃\n` +
                           `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                           `> *⚡ Powered by SACHIYA-MD 💫*`;

      // 5. Send the generated image with caption and clean up the waiting text
      await sachiya.sendMessage(from, {
        image: imageBuffer,
        caption: imageCaption
      }, { quoted: mek });

      // Delete the temporary waiting message to keep chat clean
      await sachiya.sendMessage(from, { delete: waitMsg.key }).catch(() => {});

      // 6. Success Reaction
      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    } catch (error) {
      console.error("GPT IMAGE ERROR:", error?.response?.data || error.message);
      
      let errorReason = error?.message || "Unknown error";
      if (error?.response?.status === 401) {
        errorReason = "Invalid or expired CometAPI Key!";
      } else if (error?.response?.status === 429) {
        errorReason = "Rate limit exceeded. Please try again later!";
      }

      return reply(`❌ *An error occurred while generating the image!*\n\n> *Reason:* \`${errorReason}\``);
    }
  }
);
