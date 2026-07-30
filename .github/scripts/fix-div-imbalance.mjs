// Quick div imbalance fixing script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '..', '..', 'posts');

const badFiles = [
  'writesonic', 'synthesia', 'runway', 'replit-agent',
  'perplexity-ai', 'langchain', 'jasper', 'glean', 'devin'
];

function countDivs(html) {
  const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!m) return { open: 0, close: 0 };
  const body = m[1];
  return {
    open: (body.match(/<div[\s>]/g) || []).length,
    close: (body.match(/<\/div>/g) || []).length
  };
}

for (const slug of badFiles) {
  const fp = path.join(POSTS_DIR, slug, 'index.html');
  let html = fs.readFileSync(fp, 'utf-8');
  const { open, close } = countDivs(html);
  const diff = open - close;
  
  if (diff <= 0) {
    console.log(`${slug}: already balanced (${open}/${close})`);
    continue;
  }

  // We need to close `diff` extra divs before the stay-updated div
  // The structure at the end (before body close) is:
  // ...content...
  // </div>  ← cta-section close
  // <div class="stay-updated">...</div>
  // </div>  ← container close
  // </body>
  
  // The extra open divs are from the truncated pros/cons section
  // that never got closed. We need to close them before the stay-updated.
  // Insert </div> x diff just before the cta-section div
  
  // Find the position of cta-section
  const ctaIdx = html.lastIndexOf('<div class="cta-section">');
  if (ctaIdx === -1) {
    console.log(`${slug}: no cta-section found`);
    continue;
  }

  const closeDivs = '</div>\n'.repeat(diff);
  html = html.substring(0, ctaIdx) + closeDivs + '\n' + html.substring(ctaIdx);
  
  fs.writeFileSync(fp, html, 'utf-8');
  const { open: o2, close: c2 } = countDivs(html);
  console.log(`${slug}: ${open}/${close} → ${o2}/${c2} (added ${diff} closing divs)`);
}
