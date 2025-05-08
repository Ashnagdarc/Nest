/*
 * Script to download notification sound files for the GearFlow application
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Make sure the sounds directory exists
const soundsDir = path.join(__dirname, '../public/sounds');
if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir, { recursive: true });
    console.log(`Created directory: ${soundsDir}`);
}

// Sound files to download
const soundFiles = [
    {
        url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=notification-sound-7062.mp3',
        dest: 'notification-bell.mp3',
        name: 'Notification Bell'
    },
    {
        url: 'https://cdn.pixabay.com/download/audio/2021/08/04/audio_42275b6cc7.mp3?filename=interface-124464.mp3',
        dest: 'notification-reminder.mp3',
        name: 'Reminder Sound'
    },
    {
        url: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_270f49386b.mp3?filename=announcement-sound-4-21464.mp3',
        dest: 'login-notification.mp3',
        name: 'Login Notification'
    }
];

// Download each sound file
soundFiles.forEach(sound => {
    const destPath = path.join(soundsDir, sound.dest);
    const file = fs.createWriteStream(destPath);

    console.log(`Downloading ${sound.name} to ${destPath}...`);

    https.get(sound.url, response => {
        // Handle HTTP errors
        if (response.statusCode !== 200) {
            console.error(`Failed to download ${sound.name}: HTTP ${response.statusCode}`);
            fs.unlinkSync(destPath); // Clean up failed download
            return;
        }

        // Pipe the download to the file
        response.pipe(file);

        // On file download completion
        file.on('finish', () => {
            file.close();
            console.log(`✅ Downloaded ${sound.name}`);
        });
    }).on('error', err => {
        // Handle network errors
        fs.unlinkSync(destPath); // Clean up failed download
        console.error(`❌ Error downloading ${sound.name}: ${err.message}`);
    });
});

console.log('Download process started. Wait for completion messages...'); 