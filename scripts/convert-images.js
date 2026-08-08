import sharp from "sharp";

async function optimize() {
  console.log("Optimisation des images de landing page...");

  // landing-constat.jpg
  await sharp("src/assets/landing-constat.jpg")
    .resize(1200)
    .webp({ quality: 80 })
    .toFile("src/assets/landing-constat.webp");

  // landing-communaute.jpg
  await sharp("src/assets/landing-communaute.jpg")
    .resize(1200)
    .webp({ quality: 80 })
    .toFile("src/assets/landing-communaute.webp");

  // hero-child.jpg
  await sharp("src/assets/hero-child.jpg")
    .resize(1200)
    .webp({ quality: 80 })
    .toFile("src/assets/hero-child.webp");

  // naya-avatar.png
  await sharp("src/assets/naya-avatar.png")
    .resize(400)
    .webp({ quality: 85 })
    .toFile("src/assets/naya-avatar.webp");

  console.log("Toutes les images ont été converties en WebP !");
}

optimize().catch(console.error);
