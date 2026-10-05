import fs from 'node:fs/promises';
import sharp from 'sharp';

await sharp('assets/brand/share.svg').png().toFile('assets/brand/share.png');
await sharp('assets/brand/repository-preview.svg').png().toFile('assets/brand/repository-preview.png');
await sharp('assets/brand/index-favicon.svg').resize(180, 180).png().toFile('assets/brand/apple-touch-icon.png');
const frames = await Promise.all([16, 32, 48].map(size => sharp('assets/brand/index-favicon.svg').resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * frames.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(frames.length, 4);
let offset = header.length;
frames.forEach((frame, i) => {
  const start = 6 + i * 16;
  header[start] = [16, 32, 48][i];
  header[start + 1] = header[start];
  header.writeUInt16LE(1, start + 4);
  header.writeUInt16LE(32, start + 6);
  header.writeUInt32LE(frame.length, start + 8);
  header.writeUInt32LE(offset, start + 12);
  offset += frame.length;
});
await fs.writeFile('public/favicon.ico', Buffer.concat([header, ...frames]));
