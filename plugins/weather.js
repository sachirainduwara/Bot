const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "weather",
    alias: ["climate", "w"],
    desc: "Check weather of any city",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර නගරයක නමක් සඳහන් කරන්න!\nඋදාහරණ: `.weather Colombo`");
        
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(q)}&units=metric&appid=060a6bcfa19809c2cd4d97a212b19273`;
        const response = await axios.get(url);
        const data = response.data;

        const weatherInfo = `╭━━━〔 *SACHIYA-MD WEATHER* 〕━━━\n` +
                            `┃\n` +
                            `┃ 🌍 *City:* ${data.name}, ${data.sys.country}\n` +
                            `┃ 🌡️ *Temperature:* ${data.main.temp}°C\n` +
                            `┃ 💧 *Humidity:* ${data.main.humidity}%\n` +
                            `┃ wind *Wind Speed:* ${data.wind.speed} m/s\n` +
                            `┃ ☁️ *Condition:* ${data.weather[0].description}\n` +
                            `┃\n` +
                            `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                            `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(weatherInfo);
    } catch (e) {
        reply("❌ ලබා දී ඇති නගරය සෙවිය නොහැක. නම නිවැරදිදැයි පරීක්ෂා කරන්න!");
    }
});
