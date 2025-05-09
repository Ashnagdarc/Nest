const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputFile = path.join(process.cwd(), 'Gearflow logo.png');
const outputDir = path.join(process.cwd(), 'public', 'icons');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Copy the original logo to public directory as favicon
fs.copyFileSync(inputFile, path.join(process.cwd(), 'public', 'favicon.png'));
console.log('Copied logo as favicon.png');

sizes.forEach(size => {
    sharp(inputFile)
        .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toFile(path.join(outputDir, `icon-${size}x${size}.png`))
        .then(info => console.log(`Generated ${size}x${size} icon`))
        .catch(err => console.error(`Error generating ${size}x${size} icon:`, err));
}); 