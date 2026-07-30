/**
 * fix-all-tags.mjs
 * Comprehensive fix for ALL remaining broken tags and garbled patterns across 43 pages.
 * 
 * Root causes:
 * 1. Emoji variation selector (U+FE0F "️") corrupted → U+FFFD → wrongly replaced as "—"
 * 2. The `<` of `</div>` etc was also corrupted, producing visible `/div>` text
 * 3. Various `—?X` patterns remained uncaught
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '..', '..', 'posts');

function fixAll(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');
  let count = 0;

  // ========== PATTERN 1: Emoji variation selector fix ==========
  // Pattern: emoji + "— /div>", "— /a>", "— /span>", "— /p>" etc
  // These were: emoji + variation-selector + proper-close-tag
  // The `—` is a wrong replacement, and the `<` before `/tag>` was lost
  const emojiAltFix = [
    // Common emoji followed by — /tag> (lost variation selector and <)
    [/🖼— \/div>/g, '🖼️</div>'],
    [/🛡— \/div>/g, '🛡️</div>'],
    [/🖥— \/div>/g, '🖥️</div>'],
    [/🎬— \/div>/g, '🎬️</div>'],
    [/🎵— \/div>/g, '🎵️</div>'],
    [/📱— \/div>/g, '📱️</div>'],
    [/💡— \/div>/g, '💡️</div>'],
    [/🔍— \/div>/g, '🔍️</div>'],
    [/⚡— \/div>/g, '⚡️</div>'],
    [/🎯— \/div>/g, '🎯️</div>'],
    [/🏆— \/div>/g, '🏆️</div>'],
    [/💻— \/div>/g, '💻️</div>'],
    [/🔧— \/div>/g, '🔧️</div>'],
    [/📝— \/div>/g, '📝️</div>'],
    [/🎤— \/div>/g, '🎤️</div>'],
    [/📹— \/div>/g, '📹️</div>'],
    [/🔗— \/div>/g, '🔗️</div>'],
    [/📁— \/div>/g, '📁️</div>'],
    [/🤖— \/div>/g, '🤖️</div>'],
    [/📡— \/div>/g, '📡️</div>'],
    [/🔬— \/div>/g, '🔬️</div>'],
    [/🧠— \/div>/g, '🧠️</div>'],
    [/📈— \/div>/g, '📈️</div>'],
    [/📊— \/div>/g, '📊️</div>'],
    [/🎨— \/div>/g, '🎨️</div>'],
    [/🎭— \/div>/g, '🎭️</div>'],
    [/🎪— \/div>/g, '🎪️</div>'],
    [/🎮— \/div>/g, '🎮️</div>'],
    [/🎯— \/div>/g, '🎯️</div>'],
    [/🖌— \/div>/g, '🖌️</div>'],
    [/✂— \/div>/g, '✂️</div>'],
    [/🔤— \/div>/g, '🔤️</div>'],
    [/🧩— \/div>/g, '🧩️</div>'],
    [/🔮— \/div>/g, '🔮️</div>'],
    [/🎲— \/div>/g, '🎲️</div>'],
  ];

  for (const [pattern, replacement] of emojiAltFix) {
    const before = html;
    html = html.replace(pattern, replacement);
    if (html !== before) count++;
  }

  // ========== PATTERN 2: Remaining "— /tag>" patterns (not emoji-related) ==========
  // These were: text content "— </tag>" where a U+FFFD became — and the < survived
  html = html.replace(/— \?<\/div>/g, ' —</div>');
  html = html.replace(/— \?<\/a>/g, ' —</a>');
  html = html.replace(/— \?<\/span>/g, ' —</span>');
  html = html.replace(/— \?<\/p>/g, ' —</p>');
  html = html.replace(/— \?<\/h/g, ' —</h');
  html = html.replace(/— \?<\/li>/g, ' —</li>');
  html = html.replace(/— \?<\/td>/g, ' —</td>');
  html = html.replace(/— \?<\/th>/g, ' —</th>');
  
  // ========== PATTERN 3: Other "—?X" patterns we missed ==========
  // — followed by ? where we already fixed context but ? remained
  html = html.replace(/—\?\//g, '— /');  // —? followed by / in text
  
  // ========== PATTERN 4: Clean any remaining U+FFFD ==========
  const ufffdBefore = (html.match(/\uFFFD/g) || []).length;
  html = html.replace(/\uFFFD/g, '');
  if (ufffdBefore > 0) count += ufffdBefore;

  // ========== PATTERN 5: Check for div tag mismatch ==========
  // Count div tags in body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    let body = bodyMatch[1];
    const openDivs = (body.match(/<div[\s>]/g) || []).length;
    const closeDivs = (body.match(/<\/div>/g) || []).length;
    
    if (openDivs > closeDivs) {
      // Find where divs are unclosed
      const missing = openDivs - closeDivs;
      
      // Look for <div that never got closed - these are often
      // <div class="icon">🖼️ that lost their </div>
      // Strategy: close them before next <div class="label"> or </div>
      
      // Fix specific pattern: <div class="icon">CONTENT<div class="label">
      // The icon div isn't closed before label div
      body = body.replace(
        /(<div class="icon">[^<]*?(\u{1F300}-\u{1F9FF}[\uFE0F]?|\p{Emoji}+))(<div class="label">)/gu,
        '$1</div>$3'
      );
      
      body = body.replace(
        /(<div class="icon">[^<]*<img[^>]*>)(<div class="label">)/g,
        '$1</div>$2'
      );
      
      // Re-count after fixes
      const newOpen = (body.match(/<div[\s>]/g) || []).length;
      const newClose = (body.match(/<\/div>/g) || []).length;
      
      if (newOpen === newClose) {
        // Rebuild HTML with fixed body
        html = html.replace(/(<body[^>]*>)[\s\S]*(<\/body>)/i, '$1' + body + '$2');
        count++;
      }
    }
    
    // Check for open <a> tags
    const openA = (body.match(/<a [^>]*>/g) || []).length;
    const closeA = (body.match(/<\/a>/g) || []).length;
    if (openA !== closeA) {
      // Fix broken <a> — add missing </a> where needed
      // Pattern: <a ...>text that ends without </a>
      body = body.replace(
        /(<a [^>]*>\s*[^<]*?)(\s*<\/div>|\s*<div)/g,
        (match, aTag, after) => {
          // Check if this <a> is already closed
          const aContent = match;
          if (!aContent.includes('</a>')) {
            return aTag + '</a>' + after;
          }
          return match;
        }
      );
      
      html = html.replace(/(<body[^>]*>)[\s\S]*(<\/body>)/i, '$1' + body + '$2');
    }
  }

  return { html, count };
}

const dirs = fs.readdirSync(POSTS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory());

let totalFixes = 0;
for (const dir of dirs) {
  const filePath = path.join(POSTS_DIR, dir.name, 'index.html');
  if (!fs.existsSync(filePath)) continue;
  
  const { html, count } = fixAll(filePath);
  if (count > 0) {
    fs.writeFileSync(filePath, html, 'utf-8');
    console.log(`✅ ${dir.name}: ${count} fixes`);
    totalFixes++;
  }
}

console.log(`\n=== ${totalFixes} pages fixed ===`);
