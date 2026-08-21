const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Convert Audio to Audio (mp3) or Video to Audio (mp3) using ffmpeg
 * @param {Buffer} buffer 
 * @param {String} ext 
 * @returns {Promise<Buffer>}
 */
function toAudio(buffer, ext) {
    return new Promise((resolve, reject) => {
        let tmpFileIn = path.join(__dirname, `../temp/${Date.now()}.${ext}`);
        let tmpFileOut = path.join(__dirname, `../temp/${Date.now()}.mp3`);
        
        // Ensure temp directory exists
        if (!fs.existsSync(path.join(__dirname, '../temp'))) {
            fs.mkdirSync(path.join(__dirname, '../temp'), { recursive: true });
        }

        fs.writeFileSync(tmpFileIn, buffer);
        
        let ffmpegProcess = spawn('ffmpeg', [
            '-y',
            '-i', tmpFileIn,
            '-vn',
            '-acodec', 'libmp3lame',
            '-ab', '128k',
            '-ar', '44100',
            '-f', 'mp3',
            tmpFileOut
        ]);

        ffmpegProcess.on('error', (err) => {
            fs.unlinkSync(tmpFileIn);
            reject(err);
        });

        ffmpegProcess.on('close', (code) => {
            try {
                fs.unlinkSync(tmpFileIn);
                if (code !== 0) {
                    return reject(new Error(`FFmpeg process exited with code ${code}`));
                }
                let resultBuffer = fs.readFileSync(tmpFileOut);
                fs.unlinkSync(tmpFileOut);
                resolve(resultBuffer);
            } catch (e) {
                reject(e);
            }
        });
    });
}

module.exports = {
    toAudio
};
