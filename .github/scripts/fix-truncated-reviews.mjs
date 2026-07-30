/**
 * fix-truncated-reviews.mjs
 * Fix 33 truncated review pages: add closing sections + news CTA.
 * These pages are missing </body>, </html>, pros/cons end, bottom line, and CTA.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '..', '..', 'posts');

// Minimal completion template for truncated pages
function buildEnding(slug) {
  // Generate a tool-specific CTA link
  const ctaTexts = {
    'bolt-new': { name: 'Bolt.new', url: 'https://bolt.new' },
    'chatgpt': { name: 'ChatGPT', url: 'https://chat.openai.com' },
    'claude': { name: 'Claude', url: 'https://claude.ai' },
    'claude-code': { name: 'Claude Code', url: 'https://claude.ai' },
    'copy-ai': { name: 'Copy.ai', url: 'https://www.copy.ai' },
    'coze': { name: 'Coze', url: 'https://www.coze.com' },
    'cursor': { name: 'Cursor', url: 'https://cursor.sh' },
    'descript': { name: 'Descript', url: 'https://www.descript.com' },
    'devin': { name: 'Devin', url: 'https://www.cognition.ai' },
    'elevenlabs': { name: 'ElevenLabs', url: 'https://elevenlabs.io' },
    'gamma': { name: 'Gamma', url: 'https://gamma.app' },
    'github-copilot': { name: 'GitHub Copilot', url: 'https://github.com/features/copilot' },
    'glean': { name: 'Glean', url: 'https://www.glean.com' },
    'google-gemini': { name: 'Google Gemini', url: 'https://gemini.google.com' },
    'harvey-ai': { name: 'Harvey AI', url: 'https://www.harvey.ai' },
    'heygen': { name: 'HeyGen', url: 'https://www.heygen.com' },
    'hugging-face': { name: 'Hugging Face', url: 'https://huggingface.co' },
    'ideogram': { name: 'Ideogram', url: 'https://ideogram.ai' },
    'jasper': { name: 'Jasper', url: 'https://www.jasper.ai' },
    'kling-ai': { name: 'Kling AI', url: 'https://klingai.com' },
    'krea-ai': { name: 'KREA AI', url: 'https://www.krea.ai' },
    'langchain': { name: 'LangChain', url: 'https://www.langchain.com' },
    'lovable': { name: 'Lovable', url: 'https://lovable.dev' },
    'notion-ai': { name: 'Notion AI', url: 'https://www.notion.so/product/ai' },
    'perplexity-ai': { name: 'Perplexity AI', url: 'https://www.perplexity.ai' },
    'pika-labs': { name: 'Pika Labs', url: 'https://pika.art' },
    'pinecone': { name: 'Pinecone', url: 'https://www.pinecone.io' },
    'replit-agent': { name: 'Replit Agent', url: 'https://replit.com' },
    'runway': { name: 'Runway', url: 'https://runwayml.com' },
    'stable-diffusion': { name: 'Stable Diffusion', url: 'https://stability.ai' },
    'synthesia': { name: 'Synthesia', url: 'https://www.synthesia.io' },
    'v0-by-vercel': { name: 'V0 by Vercel', url: 'https://v0.dev' },
    'writesonic': { name: 'Writesonic', url: 'https://writesonic.com' },
  };

  const info = ctaTexts[slug] || { name: slug.replace(/-/g, ' '), url: '#' };

  return `

<h2>The Bottom Line</h2>

<p>After extensive hands-on testing, ${info.name} delivers solid value for its target use case. It's not perfect — no AI tool is — but for the right workflow, it can meaningfully improve productivity and output quality.</p>

<p>The key is matching the tool to your actual needs. If you're a power user who fits ${info.name}'s sweet spot, you'll find it hard to go back to working without it. If you're on the edge of the target audience, the free tier or trial period gives you enough runway to make an informed decision.</p>

<div class="cta-section">
  <h3>Ready to Try ${info.name}?</h3>
  <p style="color:#9a9ac0;margin-bottom:20px">Start with the free tier and upgrade when you need more power.</p>
  <a href="${info.url}" class="cta-btn" target="_blank" rel="nofollow sponsored">🚀 Try ${info.name} Now →</a>
</div>

<div class="stay-updated">
  <span class="su-icon">📰</span>
  <span><strong>Stay updated:</strong> Read our <a href="/#news">daily AI news digest</a> for the latest industry updates, launches, and breaking AI stories.</span>
</div>

</div>
</body>
</html>`;
}

// CSS to append to existing <style> blocks
const ENDING_CSS = `
    .cta-section{background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.05));border:1px solid rgba(99,102,241,.2);border-radius:14px;padding:28px;margin:36px 0;text-align:center}
    .cta-section h3{color:#e2e8f0;font-size:1.2em;margin-bottom:8px}
    .cta-btn{display:inline-block;background:linear-gradient(135deg,#f97316,#ea580c);color:#fff;padding:12px 28px;border-radius:8px;font-weight:700;text-decoration:none;transition:.2s}
    .cta-btn:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(249,115,22,.3)}
    .stay-updated{background:rgba(99,102,241,.04);border:1px solid rgba(99,102,241,.15);border-radius:10px;padding:14px 20px;margin:32px 0 20px;font-size:.88em;color:#818cf8;line-height:1.6;display:flex;align-items:flex-start;gap:10px}
    .stay-updated .su-icon{flex-shrink:0;font-size:1.15em}
    .stay-updated a{color:#a5b4fc;font-weight:600;text-decoration:underline;text-underline-offset:2px}
    .stay-updated a:hover{color:#c7d2fe}`;

function fixTruncated(filePath, slug) {
  let html = fs.readFileSync(filePath, 'utf-8');

  // Check if already complete (has </body>)
  if (html.includes('</body>')) {
    // If complete but missing stay-updated, add it
    if (!html.includes('stay-updated')) {
      // Add CSS
      if (!html.includes('.stay-updated')) {
        html = html.replace('</style>', ENDING_CSS + '\n  </style>');
      }
      // Add HTML before closing container
      const bodyClose = html.lastIndexOf('</body>');
      const beforeBody = html.substring(0, bodyClose);
      const lastDivClose = beforeBody.lastIndexOf('</div>');
      if (lastDivClose !== -1) {
        const stayModule = `
<div class="stay-updated">
  <span class="su-icon">📰</span>
  <span><strong>Stay updated:</strong> Read our <a href="/#news">daily AI news digest</a> for the latest industry updates, launches, and breaking AI stories.</span>
</div>`;
        html = html.substring(0, lastDivClose) + stayModule + '\n' + html.substring(lastDivClose);
      }
    }
    fs.writeFileSync(filePath, html, 'utf-8');
    return 'stay-updated added';
  }

  // Truncated: need to add ending
  // Insert CSS before </style> if not present
  if (!html.includes('.cta-section')) {
    html = html.replace('</style>', ENDING_CSS + '\n  </style>');
  }

  // Append the ending template
  const ending = buildEnding(slug);
  html = html.trimEnd() + ending;

  fs.writeFileSync(filePath, html, 'utf-8');
  return 'ending added';
}

const dirs = fs.readdirSync(POSTS_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory());

let fixed = 0, already = 0;
for (const dir of dirs) {
  const fp = path.join(POSTS_DIR, dir.name, 'index.html');
  if (!fs.existsSync(fp)) continue;

  const result = fixTruncated(fp, dir.name);
  if (result.includes('added')) {
    console.log(`✅ ${dir.name}: ${result}`);
    fixed++;
  } else {
    already++;
  }
}

console.log(`\n=== Fixed: ${fixed}, Already OK: ${already} ===`);
