// Builds web-ready WebP variants of every master in assets/img/art/full/
// (plus the profile photo) and prints each piece's size and ambient tone
// for use in index.html.
//
//   npm i --no-save sharp && node tools/build-images.mjs

import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const srcDir = path.join(root, "assets/img/art/full");
const outDir = path.join(root, "assets/img/art/web");
const WIDTHS = [400, 640, 1200];
const QUALITY = 78;

function tone(data) {
  // Weight pixels by saturation so washes of colour win over white paper.
  let r = 0, g = 0, b = 0, wsum = 0;
  for (let i = 0; i < data.length; i += 3) {
    const R = data[i], G = data[i + 1], B = data[i + 2];
    const max = Math.max(R, G, B), min = Math.min(R, G, B);
    const w = 0.002 + ((max - min) / 255) ** 3;
    r += R * w; g += G * w; b += B * w; wsum += w;
  }
  const hex = (v) => Math.round(v / wsum).toString(16).padStart(2, "0");
  return "#" + hex(r) + hex(g) + hex(b);
}

await mkdir(outDir, { recursive: true });
const files = (await readdir(srcDir)).filter((f) => f.endsWith(".jpg"))
  .sort((a, b) => parseInt(a) - parseInt(b));

for (const file of files) {
  const id = path.basename(file, ".jpg");
  const src = path.join(srcDir, file);
  const { width, height } = await sharp(src).metadata();
  for (const w of WIDTHS) {
    if (w >= width) continue;
    await sharp(src).resize({ width: w }).webp({ quality: QUALITY }).toFile(path.join(outDir, `${id}-${w}.webp`));
  }
  await sharp(src).webp({ quality: QUALITY }).toFile(path.join(outDir, `${id}-full.webp`));
  const { data } = await sharp(src).resize(48, 48, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  console.log(`${id}\t${width}x${height}\t${tone(data)}`);
}

const profile = path.join(root, "assets/img/profile.jpg");
for (const w of [480, 960]) {
  await sharp(profile).resize({ width: w }).webp({ quality: QUALITY }).toFile(path.join(root, `assets/img/profile-${w}.webp`));
}
console.log("profile\tdone");
