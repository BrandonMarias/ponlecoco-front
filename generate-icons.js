const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Crear directorios necesarios
const androidDir = 'android/app/src/main/res';
const directories = [
  'mipmap-hdpi',
  'mipmap-mdpi',
  'mipmap-xhdpi',
  'mipmap-xxhdpi',
  'mipmap-xxxhdpi'
];

// Tamaños de iconos para Android
const androidSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192
};

async function generateIcons() {
  const logoPath = 'public/media/img/logo.png';

  if (!fs.existsSync(logoPath)) {
    console.error('Logo no encontrado en:', logoPath);
    return;
  }

  // Crear directorios si no existen
  directories.forEach(dir => {
    const fullPath = path.join(androidDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });

  // Generar iconos para Android
  for (const [folder, size] of Object.entries(androidSizes)) {
    const outputPath = path.join(androidDir, folder, 'ic_launcher.png');
    await sharp(logoPath)
      .resize(size, size, { fit: 'cover' })
      .png()
      .toFile(outputPath);
    console.log(`✅ Generado: ${outputPath} (${size}x${size})`);
  }

  // Generar iconos redondos para Android
  for (const [folder, size] of Object.entries(androidSizes)) {
    const outputPath = path.join(androidDir, folder, 'ic_launcher_round.png');
    await sharp(logoPath)
      .resize(size, size, { fit: 'cover' })
      .composite([{
        input: Buffer.from(`
          <svg width="${size}" height="${size}">
            <defs>
              <clipPath id="clip">
                <circle cx="${size/2}" cy="${size/2}" r="${size/2}"/>
              </clipPath>
            </defs>
            <rect width="${size}" height="${size}" fill="white" clip-path="url(#clip)"/>
          </svg>
        `),
        blend: 'dest-in'
      }])
      .png()
      .toFile(outputPath);
    console.log(`✅ Generado: ${outputPath} (${size}x${size} redondo)`);
  }

  // Generar favicon para web
  await sharp(logoPath)
    .resize(32, 32)
    .png()
    .toFile('public/favicon.ico');
  console.log('✅ Generado: public/favicon.ico');

  console.log('\n🎉 ¡Todos los iconos generados correctamente!');
}

generateIcons().catch(console.error);
