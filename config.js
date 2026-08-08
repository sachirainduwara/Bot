const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

module.exports = {
  PREFIX: process.env.PREFIX || ".",
  OWNER_NUM: process.env.OWNER_NUM || "94760579211",
  ALIVE_IMG: process.env.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true",
  MODE: process.env.MODE || "public"
};
