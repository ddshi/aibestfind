/**
 * fix-garbled.mjs
 * Fix U+FFFD (replacement character) in all review pages.
 * Also fix hero-badge to use white text.
 * Also fix layout inconsistencies.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '..', '..', 'posts');

// U+FFFD byte sequence
const FFFD = Buffer.from([0xEF, 0xBF, 0xBD]);

function fixFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const replacements = [];
  
  // Find all U+FFFD positions
  for (let i = 0; i < buf.length - 2; i++) {
    if (buf[i] === 0xEF && buf[i + 1] === 0xBF && buf[i + 2] === 0xBD) {
      // Get context after the U+FFFD (up to 20 bytes)
      const afterStart = i + 3;
      const afterEnd = Math.min(buf.length, afterStart + 20);
      const after = buf.slice(afterStart, afterEnd).toString('utf8');
      
      let replacement = null;
      
      // Pattern 1: CTA link arrow "→</a>" or "→/a>"
      if (/^\?<\/a>|^\?\/a>/.test(after)) {
        replacement = '→';
      }
      // Pattern 2: Back link "← Back"
      else if (/^\?Back to/.test(after)) {
        replacement = '←';
      }
      // Pattern 3: External link "→ opens"
      else if (/^\?opens/.test(after)) {
        replacement = '→';
      }
      // Pattern 4: "→ we are" / "→ we may" (affiliate note)
      else if (/^\?we are|^\?we may/.test(after)) {
        replacement = '—';
      }
      // Pattern 5: Pros heading "✅ What"
      else if (/^\?What We Like|^\?What's Good|^\?What's Great|^\?What We Loved|^\?The Good|^\?Pros|^\?What Works/.test(after)) {
        replacement = '✅';
      }
      // Pattern 6: Cons heading "⚠️ What"
      else if (/^\?What's Not|^\?Considerations|^\?What to Watch|^\?The Bad|^\?Cons|^\?What Could Be Better|^\?Watch Out|^\?Limitations|^\?Drawbacks|^\?What Needs Work|^\?Room for/.test(after)) {
        replacement = '⚠️';
      }
      // Pattern 7: Testimonial author "— Name"
      else if (/^\?My |^\?—/.test(after)) {
        replacement = '—';
      }
      // Pattern 8: Right arrow in other link contexts
      else if (/^\?\/a>/.test(after) || after.startsWith('?')) {
        // Context-based: check surrounding bytes to guess
        // Most standalone `?` after U+FFFD are em dashes in text
        const before = buf.slice(Math.max(0, i - 5), i).toString('utf8');
        if (/[a-z]\s*$/.test(before)) {
          replacement = '—';
        } else {
          replacement = '—'; // default to em dash for text
        }
      }
      // Pattern 9: U+FFFD NOT followed by "?" — likely a variation selector issue with emoji
      else {
        // Common emoji patterns: 🖼️ 🛡️ 🎨 📊 🖥️ etc.
        // The variation selector U+FE0F was corrupted
        // Check preceding bytes for emoji
        const before = buf.slice(Math.max(0, i - 8), i).toString('utf8');
        if (/[🖼🛡🎨📊🖥🎬🎵📱💡🔍⚡🎯🏆💻🔧📝🎤📹🔗📁🤖📡🔬🧠📈🗂️]/u.test(before)) {
          replacement = '️'; // variation selector
        }
      }
      
      if (replacement) {
        replacements.push({ pos: i, replacement: Buffer.from(replacement, 'utf8') });
      }
    }
  }
  
  if (replacements.length === 0) return 0;
  
  // Apply replacements (reverse order to maintain positions)
  let result = buf;
  for (const r of replacements.reverse()) {
    const before = result.slice(0, r.pos);
    const after = result.slice(r.pos + 3); // skip U+FFFD (3 bytes)
    result = Buffer.concat([before, r.replacement, after]);
  }
  
  fs.writeFileSync(filePath, result);
  return replacements.length;
}

// Also fix hero-badge: white text on colored background
function fixHeroBadge(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');
  let modified = false;
  
  // Change hero-badge from colored text to white text on solid background
  html = html.replace(
    /\.hero-badge\{display:inline-block;padding:6px 20px;border-radius:50px;background:(rgba\([^)]+\));color:([^;]+);font-size:\.85em;font-weight:600;margin-bottom:20px\}/,
    (match, bgColor, textColor) => {
      // Use a slightly more opaque version for white text readability
      const semiOpaque = bgColor.replace(/0\.\d+\)/, '0.18)');
      return `.hero-badge{display:inline-block;padding:6px 20px;border-radius:50px;background:${semiOpaque};color:#fff;font-size:.85em;font-weight:600;margin-bottom:20px}`;
    }
  );
  
  if (html !== fs.readFileSync(filePath, 'utf-8')) {
    fs.writeFileSync(filePath, html, 'utf-8');
    modified = true;
  }
  return modified;
}

// Fix layout: remove leftover `?` characters that follow the U+FFFD replacement
function fixStrayQuestionMarks(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');
  let count = 0;
  
  // After our replacement, there might be stray `?` where U+FFFD? used to be
  // These would be `?` that are now standalone where they shouldn't be
  // We already handled the `?` in our replacement logic above by including it in the after check
  // But some might remain. Let's clean up any remaining odd patterns.
  
  // Fix: "→?</a>" → "→</a>"
  html = html.replace(/→\?<\/a>/g, '→</a>');
  html = html.replace(/→\?\/a>/g, '→</a>');
  
  // Fix: "←?Back" → "← Back"
  html = html.replace(/←\?Back to/g, '← Back to');
  
  // Fix: "—?we are" → "— we are"
  html = html.replace(/—\?we are/g, '— we are');
  html = html.replace(/—\?we may/g, '— we may');
  
  // Fix: "✅?What" → "✅ What"
  html = html.replace(/✅\?What/g, '✅ What');
  
  // Fix: "⚠️?What" → "⚠️ What" 
  html = html.replace(/⚠️\?What/g, '⚠️ What');
  html = html.replace(/⚠️\?Considerations/g, '⚠️ Considerations');
  html = html.replace(/⚠️\?The Bad/g, '⚠️ The Bad');
  html = html.replace(/⚠️\?Watch Out/g, '⚠️ Watch Out');
  html = html.replace(/⚠️\?Drawbacks/g, '⚠️ Drawbacks');
  html = html.replace(/⚠️\?Room for/g, '⚠️ Room for');
  html = html.replace(/⚠️\?What Could/g, '⚠️ What Could');
  html = html.replace(/⚠️\?What Needs/g, '⚠️ What Needs');
  html = html.replace(/⚠️\?Limitations/g, '⚠️ Limitations');
  
  // Fix em dash patterns
  html = html.replace(/—\?(?!\s)/g, '— ');
  
  // Any other `\uFFFD` remnants
  html = html.replace(/\uFFFD/g, '');
  
  if (html !== fs.readFileSync(filePath, 'utf-8')) {
    fs.writeFileSync(filePath, html, 'utf-8');
    count++;
  }
  return count;
}

console.log('=== Fixing garbled characters & badges ===\n');

const dirs = fs.readdirSync(POSTS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory());

let totalGarbled = 0;
let totalBadge = 0;
let totalStray = 0;

for (const dir of dirs) {
  const filePath = path.join(POSTS_DIR, dir.name, 'index.html');
  if (!fs.existsSync(filePath)) continue;
  
  const garbled = fixFile(filePath);
  const badge = fixHeroBadge(filePath);
  const stray = fixStrayQuestionMarks(filePath);
  
  if (garbled > 0 || badge || stray > 0) {
    console.log(`✅ ${dir.name}: ${garbled} chars fixed, badge=${badge}, stray=${stray}`);
  }
  totalGarbled += garbled;
  totalBadge += badge ? 1 : 0;
  totalStray += stray;
}

console.log(`\n=== Total: ${totalGarbled} garbled chars, ${totalBadge} badges, ${totalStray} stray marks ===`);
