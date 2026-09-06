import fs from "node:fs";
import path from "node:path";

const srcDir = path.resolve(".output/public");
const targets = [
  path.resolve(".vercel/output/static"),
  path.resolve("public"),
];

if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir).filter((f) => f.startsWith("sw.") || f.startsWith("workbox-"));
  for (const target of targets) {
    try {
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
      }
      for (const file of files) {
        fs.copyFileSync(path.join(srcDir, file), path.join(target, file));
      }
      console.log(`[PWA] Copied ${files.length} service worker files to ${target}`);
    } catch (err) {
      console.warn(`[PWA] Non-fatal error copying to ${target}:`, err);
    }
  }
}
