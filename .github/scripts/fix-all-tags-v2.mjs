/**
 * fix-all-tags-v2.mjs
 * One-pass fix: replace all "— /tagname>" patterns with "</tagname>"
 * These are broken closing tags where < was corrupted to "— ".
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '..', '..', 'posts');

function fixPage(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');
  let fixed = 0;

  // Fix 1: Replace all "— /tagname>" → "</tagname>" for common HTML tags
  // These are broken closing tags where the < was corrupted to "— "
  const brokenClose = [
    [/— \/div>/g, '</div>'],
    [/— \/td>/g, '</td>'],
    [/— \/th>/g, '</th>'],
    [/— \/tr>/g, '</tr>'],
    [/— \/a>/g, '</a>'],
    [/— \/span>/g, '</span>'],
    [/— \/p>/g, '</p>'],
    [/— \/li>/g, '</li>'],
    [/— \/h2>/g, '</h2>'],
    [/— \/h3>/g, '</h3>'],
    [/— \/h4>/g, '</h4>'],
    [/— \/ul>/g, '</ul>'],
    [/— \/ol>/g, '</ol>'],
    [/— \/table>/g, '</table>'],
  ];

  for (const [pattern, replacement] of brokenClose) {
    const before = html;
    html = html.replace(pattern, replacement);
    if (html !== before) fixed++;
  }

  // Fix 2: Clean any remaining U+FFFD
  const ufffdCount = (html.match(/\uFFFD/g) || []).length;
  if (ufffdCount > 0) {
    html = html.replace(/\uFFFD/g, '');
    fixed += ufffdCount;
  }

  // Fix 3: Remove stray single "?" that appear before </tag> patterns
  // These were leftover from the original U+FFFD? corruption
  html = html.replace(/\?<\/(div|td|th|a|span|p|li|h\d|ul|ol|table)>/g, '</$1>');

  if (fixed > 0) {
    fs.writeFileSync(filePath, html, 'utf-8');
  }
  return fixed;
}

// Also fix index.html
const indexPath = path.resolve(__dirname, '..', '..', 'index.html');
if (fs.existsSync(indexPath)) {
  const n = fixPage(indexPath);
  if (n) console.log(`✅ index.html: ${n} fixes`);
}

const dirs = fs.readdirSync(POSTS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory());

let total = 0;
for (const dir of dirs) {
  const filePath = path.join(POSTS_DIR, dir.name, 'index.html');
  if (!fs.existsSync(filePath)) continue;
  
  const n = fixPage(filePath);
  if (n > 0) {
    console.log(`✅ ${dir.name}: ${n} fixes`);
    total++;
  }
}

console.log(`\n=== ${total} pages fixed ===`);
