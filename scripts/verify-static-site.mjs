import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "index.html",
  "styles.css",
  "script.js",
  "assets/favicon.png",
  "assets/apple-touch-icon.png",
  "assets/frames/cook/final.webp",
];

const missing = [];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) {
    missing.push(file);
  }
}

const framesDir = path.join(root, "assets/frames/cook");
const frames = fs.existsSync(framesDir)
  ? fs.readdirSync(framesDir).filter((name) => /^frame-\d{3}\.webp$/.test(name))
  : [];

if (frames.length < 100) {
  missing.push("at least 100 WebP animation frames");
}

const html = fs.existsSync(path.join(root, "index.html"))
  ? fs.readFileSync(path.join(root, "index.html"), "utf8")
  : "";
const script = fs.existsSync(path.join(root, "script.js"))
  ? fs.readFileSync(path.join(root, "script.js"), "utf8")
  : "";

const requiredHtml = [
  ["stylesheet link", /styles\.css/],
  ["script tag", /script\.js/],
  ["canvas element", /<canvas/i],
  ["mailto call to action", /mailto:/i],
];

for (const [label, pattern] of requiredHtml) {
  if (!pattern.test(html)) {
    missing.push(label);
  }
}

if (!/requestAnimationFrame|drawImage|frame-\$\{/.test(script)) {
  missing.push("scroll/canvas frame-rendering logic");
}

if (missing.length > 0) {
  console.error("Nozomio static site verification failed:");
  for (const item of missing) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log(`Nozomio static site verification passed with ${frames.length} animation frames.`);
