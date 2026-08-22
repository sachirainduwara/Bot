const mongoose = require('mongoose');
const config = require('../config');

// MongoDB Connection String
const MONGO_URI = config.SESSION_ID;

// Mongoose Schema for Autoread settings
const AutoReadSchema = new mongoose.Schema({
    _id: { type: String, required: true, default: 'autoread_config' },
    enabled: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
});

const AutoReadModel = mongoose.models.AutoRead || mongoose.model('AutoRead', AutoReadSchema);

async function connectDB() {
    try {
        if (mongoose.connection.readyState === 0 && MONGO_URI) {
            await mongoose.connect(MONGO_URI);
        }
    } catch (error) {}
}

async function isAutoreadEnabled() {
    try {
        await connectDB();
        let configData = await AutoReadModel.findOne({ _id: 'autoread_config' });
        return configData ? configData.enabled : false;
    } catch (error) {
        return false;
    }
}

// Function to handle automatic reading
async function handleAutoread(sachiya, mek) {
    try {
        const enabled = await isAutoreadEnabled();
        if (enabled && !mek.key.fromMe) {
            const key = { 
                remoteJid: mek.key.remoteJid, 
                id: mek.key.id, 
                participant: mek.key.participant 
            };
            await sachiya.readMessages([key]);
            return true;
        }
    } catch (error) {}
    return false;
}

module.exports = {
    handleAutoread
};
