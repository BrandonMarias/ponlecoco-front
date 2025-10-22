const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Crear splash screens para Android
const splashSizes = {
  'drawable': { width: 320, height: 480 },
  'drawable-land': { width: 480, height: 320 },
  'drawable-hdpi': { width: 480, height: 800 },
  'drawable-land-hdpi': { width: 800, height: 480 },
  'drawable-xhdpi': { width: 720, height: 1280 },
  'drawable-land-xhdpi': { width: 1280, height: 720 },
  'drawable-xxhdpi': { width: 1080, height: 1920 },
  'drawable-land-xxhdpi': { width: 1920, height: 1080 },
  'drawable-xxxhdpi': { width: 1440, height: 2560 },
  'drawable-land-xxxhdpi': { width: 2560, height: 1440 }
};

async function generateSplashScreens() {
  const logoPath = 'public/media/img/logo.png';
  const androidResDir = 'android/app/src/main/res';

  if (!fs.existsSync(logoPath)) {
    console.error('Logo no encontrado en:', logoPath);
    return;
  }

  // Crear directorios si no existen
  Object.keys(splashSizes).forEach(folder => {
    const fullPath = path.join(androidResDir, folder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });

  // Generar splash screens
  for (const [folder, dimensions] of Object.entries(splashSizes)) {
    const outputPath = path.join(androidResDir, folder, 'splash.png');

    // Crear un fondo con el color de la app y el logo centrado
    const logoSize = Math.min(dimensions.width, dimensions.height) * 0.3; // Logo ocupa 30% del menor lado

    await sharp({
      create: {
        width: dimensions.width,
        height: dimensions.height,
        channels: 4,
        background: { r: 31, g: 41, b: 55, alpha: 1 } // Color #1f2937
      }
    })
    .composite([
      {
        input: await sharp(logoPath)
          .resize(Math.round(logoSize), Math.round(logoSize), { fit: 'inside', withoutEnlargement: true })
          .png()
          .toBuffer(),
        gravity: 'center'
      }
    ])
    .png()
    .toFile(outputPath);

    console.log(`✅ Splash generado: ${outputPath} (${dimensions.width}x${dimensions.height})`);
  }

  console.log('\n🎉 ¡Todos los splash screens generados correctamente!');
}

generateSplashScreens().catch(console.error);
