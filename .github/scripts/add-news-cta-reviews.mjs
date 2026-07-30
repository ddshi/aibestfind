/**
 * add-news-cta-reviews.mjs
 * Add "Stay Updated" news CTA to all review pages, after the affiliate CTA section.
 * This creates the reverse funnel: reviews → news.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '..', '..', 'posts');

const STAY_UPDATED_HTML = `
<div class="stay-updated">
  <span class="su-icon">📰</span>
  <span><strong>Stay updated:</strong> Read our <a href="/#news">daily AI news digest</a> for the latest industry updates, launches, and breaking AI stories.</span>
</div>`;

const STAY_UPDATED_CSS = `
    .stay-updated{background:rgba(99,102,241,.04);border:1px solid rgba(99,102,241,.15);border-radius:10px;padding:14px 20px;margin:32px 0 20px;font-size:.88em;color:#818cf8;line-height:1.6;display:flex;align-items:flex-start;gap:10px}
    .stay-updated .su-icon{flex-shrink:0;font-size:1.15em}
    .stay-updated a{color:#a5b4fc;font-weight:600;text-decoration:underline;text-underline-offset:2px}
    .stay-updated a:hover{color:#c7d2fe}`;

function addNewsCta(filePath) {
  let html = fs.readFileSync(filePath, 'utf-8');
  let modified = false;

  // Check if already added
  if (html.includes('stay-updated')) {
    return { modified: false, reason: 'already present' };
  }

  // Add CSS (before the closing </style> tag)
  if (!html.includes('.stay-updated')) {
    html = html.replace('</style>', STAY_UPDATED_CSS + '\n  </style>');
    modified = true;
  }

  // Add HTML (after the last affiliate-link-note or cta-section closing div)
  // Strategy: insert before the last </div> that's before </body>
  // More precisely: after the affiliate-link-note div (which is the last element before the container close)
  // Pattern: </div>\n\n</div>\n</body>
  // We need to insert after the cta-section's closing </div>
  
  // Find the position of the closing container div that wraps all content
  // The structure is: <body><div class="container">...content...</div></body>
  // Insert before the closing container </div>
  
  const bodyClose = html.lastIndexOf('</body>');
  if (bodyClose === -1) {
    return { modified: false, reason: 'no body tag found' };
  }

  // Find the last </div> before </body> — this is the container close
  const beforeBody = html.substring(0, bodyClose);
  const lastDivClose = beforeBody.lastIndexOf('</div>');
  
  if (lastDivClose === -1) {
    return { modified: false, reason: 'no closing div found' };
  }

  html = html.substring(0, lastDivClose) + STAY_UPDATED_HTML + '\n' + html.substring(lastDivClose);
  modified = true;

  if (modified) {
    fs.writeFileSync(filePath, html, 'utf-8');
    return { modified: true, reason: 'added' };
  }
  return { modified: false, reason: 'unknown' };
}

const dirs = fs.readdirSync(POSTS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory());

let added = 0, skipped = 0;
for (const dir of dirs) {
  const fp = path.join(POSTS_DIR, dir.name, 'index.html');
  if (!fs.existsSync(fp)) continue;
  
  const result = addNewsCta(fp);
  if (result.modified) {
    console.log(`✅ ${dir.name}: ${result.reason}`);
    added++;
  } else {
    skipped++;
  }
}

console.log(`\n=== Added: ${added}, Skipped: ${skipped} ===`);
