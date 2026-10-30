// Menyalin file font (.woff2) dari node_modules ke assets/fonts
// agar font di-host sendiri tanpa Google Fonts.
// Dijalankan otomatis setelah `npm install` (postinstall).
import { mkdirSync, copyFileSync } from 'node:fs';

const dest = 'assets/fonts';
mkdirSync(dest, { recursive: true });

const fonts = [
  ['node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2', 'inter-latin-wght.woff2'],
  ['node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2', 'jetbrains-mono-latin-wght.woff2'],
];

for (const [src, name] of fonts) {
  copyFileSync(src, `${dest}/${name}`);
  console.log(`✔ ${name}`);
}
