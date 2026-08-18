const fs = require('fs');
if (fs.existsSync('config.env')) require('dotenv').config({ path: './config.env' });

module.exports = {
  SESSION_ID: process.env.SESSION_ID || "mongodb+srv://sachirainduwara02_db_user:Sachi2010@cluster0.skykj4x.mongodb.net/?appName=Cluster0",
  PREFIX: process.env.PREFIX || ".",
  OWNER_NUM: process.env.OWNER_NUM || "94760579211",
  ALIVE_IMG: process.env.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true",
  MODE: process.env.MODE || "public"
  APIFY_API_KEY: pricess.env.APIFY_API_KEY || "https://api.apify.com/v2/key-value-stores/VA66ZMK66qtAaFw8H/records/44a6a74f-760f-4b8d-88a4-8eb396597a26?attachment=true”
  "
};
