const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

function convertToBool(text, fault = 'true') {
    return text === fault ? true : false;
}

module.exports = {
    SESSION_ID: process.env.SESSION_ID || "",
    PREFIX: process.env.PREFIX || ".",
    OWNER_NUM: process.env.OWNER_NUM || "94771081150",
    ALIVE_IMG: process.env.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true",
    MEGA_EMAIL: process.env.MEGA_EMAIL || "sachirainduwara02@gmail.com",
    MEGA_PASSWORD: process.env.MEGA_PASSWORD || "Sachi@2010"
};
