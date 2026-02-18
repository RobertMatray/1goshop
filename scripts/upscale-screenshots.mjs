import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sizes = {
  '6.7': { w: 1290, h: 2796 },
  '6.5': { w: 1284, h: 2778 },
};

async function processDir(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));

  for (const [sizeName, { w, h }] of Object.entries(sizes)) {
    const outDir = path.join(dir, sizeName);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    for (const file of files) {
      const inPath = path.join(dir, file);
      const outName = file.replace(/\.(jpeg|jpg|png)$/, '.png');
      const outPath = path.join(outDir, outName);

      await sharp(inPath)
        .resize(w, h, { fit: 'fill' })
        .png()
        .toFile(outPath);

      console.log(`  ${outPath}`);
    }
  }
}

console.log('Processing EN...');
await processDir('appstore-screenshots/EN');
console.log('Processing SK...');
await processDir('appstore-screenshots/SK');
console.log('Done!');
