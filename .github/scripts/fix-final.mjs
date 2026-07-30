/**
 * fix-final.mjs
 * 1. Fix hero-badge: increase bg opacity for white text readability
 * 2. Remove any remaining U+FFFD from badge text
 * 3. Normalize layout: consistent spacing, no stray chars
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '..', '..', 'posts');

const dirs = fs.readdirSync(POSTS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory());

for (const dir of dirs) {
  const filePath = path.join(POSTS_DIR, dir.name, 'index.html');
  if (!fs.existsSync(filePath)) continue;
  
  let html = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // 1. Fix badge: high-opacity bg + white text (was rgba(...,.08) which is invisible)
  // Match: .hero-badge{...background:rgba(R,G,B,.XX);color:#fff;...}
  html = html.replace(
    /\.hero-badge\{display:inline-block;padding:6px 20px;border-radius:50px;background:rgba\((\d+),(\d+),(\d+),0?\.\d+\);color:#fff;font-size:\.85em;font-weight:600;margin-bottom:20px\}/,
    (match, r, g, b) => {
      return `.hero-badge{display:inline-block;padding:6px 20px;border-radius:50px;background:rgb(${r},${g},${b});color:#fff;font-size:.85em;font-weight:600;margin-bottom:20px}`;
    }
  );

  // 2. Remove any remaining U+FFFD in the HTML body
  if (html.includes('\uFFFD')) {
    html = html.replace(/\uFFFD/g, '');
    modified = true;
  }

  // 3. Remove any remaining stray `?` that follows our fix patterns
  // These are left over from the U+FFFD? sequence where U+FFFD was replaced
  // but the `?` remained
  // CTA: "→?</a>" → "→</a>"
  html = html.replace(/→\?<\/a>/g, '→</a>');
  // Back link: "←?Back" → "← Back"  
  html = html.replace(/←\?Back to/g, '← Back to');
  // Affiliate: "—?we" → "— we"
  html = html.replace(/—\?we /g, '— we ');
  // Pros: "✅?" → "✅ "
  html = html.replace(/✅\?/g, '✅ ');
  // Cons: "⚠️?" → "⚠️ "
  html = html.replace(/⚠️\?/g, '⚠️ ');
  // General em-dash patterns
  html = html.replace(/—\?([a-zA-Z])/g, '— $1');
  // Testimonial: "—?My" → "— My" / "—?—" → "——"
  html = html.replace(/—\?My /g, '— My ');
  html = html.replace(/—\?—/g, '——');

  if (html !== fs.readFileSync(filePath, 'utf-8')) {
    fs.writeFileSync(filePath, html, 'utf-8');
    console.log(`✅ ${dir.name}`);
  }
}

console.log('\n=== Done ===');
