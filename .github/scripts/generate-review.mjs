/**
 * generate-review.mjs
 * 每天自动生成一篇AI工具评测文章
 * 自动去重：已评测过的工具不会再次生成
 *
 * 流程：
 * 1. 扫描 posts/ 目录获取已评测工具
 * 2. 从 tools.json 读取待评测工具（排除已评测的）
 * 3. 调用 DeepSeek 生成完整HTML评测文章
 * 4. 写入 posts/{slug}/index.html
 * 5. 更新 index.html（articleTitles + staticTools）
 * 6. 从 tools.json 移除已评测工具
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');
const POSTS_DIR = path.join(ROOT, 'posts');
const TOOLS_PATH = path.join(ROOT, 'tools.json');
const INDEX_PATH = path.join(ROOT, 'index.html');

// ========= 工具函数 =========

function slugify(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 扫描 posts/ 目录获取已有评测的 slug 列表 */
function getExistingReviews() {
  if (!fs.existsSync(POSTS_DIR)) return new Set();
  const entries = fs.readdirSync(POSTS_DIR, { withFileTypes: true });
  const slugs = new Set();
  entries.filter(e => e.isDirectory()).forEach(e => {
    const indexPath = path.join(POSTS_DIR, e.name, 'index.html');
    if (fs.existsSync(indexPath)) slugs.add(e.name);
  });
  return slugs;
}

/** 读取 tools.json */
function getTools() {
  if (!fs.existsSync(TOOLS_PATH)) return [];
  return JSON.parse(fs.readFileSync(TOOLS_PATH, 'utf-8'));
}

/** DeepSeek API 调用 */
function deepseekChat(messages) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return reject(new Error('DEEPSEEK_API_KEY not set'));

    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 4096
    });

    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error('DeepSeek API error response body:', data.substring(0, 500));
          return reject(new Error(`API ${res.statusCode}: ${data.substring(0, 200)}`));
        }
        try {
          const json = JSON.parse(data);
          if (json.error) {
            console.error('DeepSeek API error details:', JSON.stringify(json.error));
            return reject(new Error(json.error.message || 'Unknown API error'));
          }
          if (!json.choices || !json.choices[0] || !json.choices[0].message) {
            console.error('Unexpected API response structure:', JSON.stringify(json).substring(0, 300));
            return reject(new Error('Unexpected API response structure'));
          }
          resolve(json.choices[0].message.content);
        } catch (e) { reject(e); }
      });
    });

    req.on('error', (err) => {
      console.error('HTTPS request error:', err.message);
      reject(err);
    });
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('API request timeout after 120s'));
    });
    req.write(body);
    req.end();
  });
}

// ========= index.html 修改函数 =========

/** 在 index.html 的 articleTitles 对象中添加新条目 */
function addArticleTitle(html, slug, enTitle, zhTitle) {
  // 在最后一个 "}" 之前插入（articleTitles 对象的关闭）
  const marker = 'const articleTitles = {';
  const endMarker = '};'; // articleTitles 结束

  // 找到 articleTitles 块的结束 }
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) throw new Error('articleTitles not found in index.html');

  // 从 marker 开始找 "};" — 这是 articleTitles 对象结束
  let depth = 0;
  let inObj = false;
  let cutIdx = -1;
  for (let i = startIdx; i < html.length - 1; i++) {
    if (html[i] === '{' && !inObj) { inObj = true; depth = 1; continue; }
    if (!inObj) continue;
    if (html[i] === '{') depth++;
    if (html[i] === '}') depth--;
    if (depth === 0) {
      // 需要确认下一个字符是 ;
      if (html[i + 1] === ';' || html[i + 1] === '\n' || html[i + 1] === '\r') {
        cutIdx = i;
        break;
      }
    }
  }
  if (cutIdx === -1) throw new Error('articleTitles closing brace not found');

  const newEntry = `
  ${slug}: {
    en: '${enTitle.replace(/'/g, "\\'")}',
    zh: '${zhTitle.replace(/'/g, "\\'")}'
  },`;

  return html.slice(0, cutIdx) + newEntry + '\n' + html.slice(cutIdx);
}

/** 在 index.html 的 staticTools 数组末尾添加新条目 */
function addStaticTool(html, tool) {
  const marker = 'const staticTools = [';

  const startIdx = html.indexOf(marker);
  if (startIdx === -1) throw new Error('staticTools not found in index.html');

  // 找到 staticTools 数组配对的 ] (用 [ ] 本身追踪深度)
  const openPos = startIdx + marker.length - 1; // '[' 的位置
  let depth = 1;
  let cutIdx = -1;
  for (let i = openPos + 1; i < html.length; i++) {
    if (html[i] === '[') depth++;
    if (html[i] === ']') {
      depth--;
      if (depth === 0) { cutIdx = i; break; }
    }
  }
  if (cutIdx === -1) throw new Error('staticTools closing bracket not found');

  const safeStr = (s) => (s || '').replace(/'/g, "\\'").replace(/\n/g, ' ');

  const newEntry = `
  {
    id: '${tool.slug}', icon:'${tool.icon}', badge:'hot',
    nameEn:'${safeStr(tool.nameEn)}', nameZh:'${safeStr(tool.nameZh)}',
    descEn:'${safeStr(tool.descEn)}', descZh:'${safeStr(tool.descZh)}',
    link:'/posts/${tool.slug}/', date: '${todayDate()}'
  },`;

  return html.slice(0, cutIdx) + newEntry + '\n' + html.slice(cutIdx);
}

function todayDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

// ========= DeepSeek Prompt 构建 =========

function buildSystemPrompt(tool) {
  return `You are a professional AI tools reviewer for aibestfind.com. Write a complete, standalone HTML review article for an AI tool. The output must be ONLY valid HTML (no markdown, no code fences).

CRITICAL RULES:
1. Output PURE HTML starting with <!DOCTYPE html> — NO markdown backticks, NO explanations
2. Follow the exact structure below — use the provided CSS, meta tags, analytics scripts
3. Write in ENGLISH
4. Be informative, balanced, and honest — include both strengths AND limitations
5. Target ~1500-2000 words for the body content
6. Use real, factual information about the tool — DO NOT fabricate features
7. The CTA button must link to the tool's official URL: ${tool.url}

=== REQUIRED HTML TEMPLATE ===

<!DOCTYPE html>
<html lang="en">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=AW-18139272358"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'AW-18139272358');
</script>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{Catchy English Title — about 60-70 chars} | AI Best Find</title>
<meta name="description" content="{SEO description — 140-160 chars, include tool name and key benefit}">
<meta property="og:title" content="{Shorter OG title}">
<meta property="og:description" content="{OG description}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafbfc;color:#111827;line-height:1.85}
.container{max-width:820px;margin:0 auto;padding:0 24px}
.hero{background:linear-gradient(135deg,{HERO_GRADIENT});padding:80px 0 60px;text-align:center;border-bottom:1px solid {HERO_BORDER_COLOR}}
.hero-badge{display:inline-block;padding:6px 20px;border-radius:50px;background:{BADGE_BG};color:{BADGE_COLOR};font-size:.85em;font-weight:600;margin-bottom:20px}
.hero h1{font-size:clamp(1.6em,4vw,2.4em);font-weight:900;line-height:1.3;margin-bottom:16px;{HERO_H1_STYLE}}
.hero p{color:{HERO_P_COLOR};font-size:1.05em;max-width:600px;margin:0 auto}
.hero-cta{display:inline-block;padding:14px 36px;border-radius:50px;background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;font-weight:700;font-size:1em;text-decoration:none;margin-top:28px;transition:.3s}
.hero-cta:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(245,158,11,.3)}
.meta{text-align:center;color:#9ca3af;font-size:.85em;padding:20px 0;border-bottom:1px solid #e5e7eb;margin-bottom:40px}
.content{padding:20px 0 60px}
.content h2{font-size:1.5em;font-weight:800;margin:48px 0 16px;color:{ACCENT_DARK}}
.content h3{font-size:1.15em;font-weight:700;margin:32px 0 12px;color:{ACCENT}}
.content p{margin-bottom:18px;color:#4b5563;font-size:1.02em}
.content ul,.content ol{margin:0 0 24px 24px;color:#4b5563}
.content li{margin-bottom:8px;font-size:1em}
.data-box{background:linear-gradient(135deg,{DATA_BOX_BG});border:1px solid #e5e7eb;border-radius:16px;padding:28px;margin:32px 0}
.data-box h3{margin-top:0;color:{ACCENT_DARK}}
.flag-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:16px}
.flag-item{text-align:center;padding:16px;background:{FLAG_ITEM_BG};border-radius:12px;font-size:.9em}
.flag-item .icon{font-size:1.6em;margin-bottom:6px}
.flag-item .label{color:#4b5563;font-size:.82em}
.testimonial{background:rgba(245,158,11,.06);border-left:3px solid #f59e0b;padding:24px;border-radius:0 12px 12px 0;margin:28px 0}
.testimonial p{font-style:italic;margin-bottom:8px;color:#4b5563}
.testimonial .author{color:#d97706;font-weight:600;font-size:.9em}
.highlight{background:{HIGHLIGHT_BG};padding:2px 8px;border-radius:4px;color:{ACCENT_DARK};font-weight:600}
.cta-section{text-align:center;padding:48px 24px;background:linear-gradient(135deg,{CTA_SECTION_BG});border:1px solid #e5e7eb;border-radius:16px;margin:48px 0}
.cta-section h3{font-size:1.3em;margin-bottom:12px;color:{ACCENT_DARK}}
.cta-btn{display:inline-block;padding:16px 40px;border-radius:50px;background:linear-gradient(135deg,#f59e0b,#f97316);color:#fff;font-weight:700;font-size:1.05em;text-decoration:none;transition:.3s;margin-top:16px}
.cta-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(245,158,11,.3)}
.pros-cons{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:28px 0}
.pros{background:rgba(16,185,129,.04);border:1px solid rgba(16,185,129,.12);border-radius:12px;padding:24px}
.cons{background:rgba(239,68,68,.04);border:1px solid rgba(239,68,68,.12);border-radius:12px;padding:24px}
.pros h4{color:#059669;margin-bottom:12px}
.cons h4{color:#dc2626;margin-bottom:12px}
.pros li,.cons li{font-size:.92em;margin-bottom:6px;color:#4b5563}
.affiliate-disclosure{background:rgba(245,158,11,.04);border:1px solid rgba(245,158,11,.15);border-radius:10px;padding:14px 20px;margin:20px 0 28px;font-size:.85em;color:#92400e;line-height:1.6;display:flex;align-items:flex-start;gap:10px}
.affiliate-disclosure .icon{flex-shrink:0;font-size:1.1em}
.affiliate-link-note{font-size:.78em;color:#9ca3af;margin-top:8px}
.back-link{display:inline-block;color:#9ca3af;text-decoration:none;font-weight:500;margin-bottom:32px;transition:.3s}
.back-link:hover{color:{ACCENT}}
@media(max-width:600px){.pros-cons{grid-template-columns:1fr}.hero{padding:50px 0 40px}.flag-grid{grid-template-columns:repeat(2,1fr)}}
</style>

<!-- AnyTrack Tracking Code -->
<script>!function(e,t,n,s,a){(a=t.createElement(n)).async=!0,a.src="https://assets.anytrack.io/JrSP3dAXXMz0.js",(t=t.getElementsByTagName(n)[0]).parentNode.insertBefore(a,t),e[s]=e[s]||function(){(e[s].q=e[s].q||[]).push(arguments)}}(window,document,"script","AnyTrack");</script>
<!-- End AnyTrack Tracking Code --></head>
<body>

<div class="hero">
  <div class="container">
    <div class="hero-badge">{BADGE_TEXT}</div>
    <h1>{MAIN_H1_TITLE}</h1>
    <p>{HERO_SUBTITLE — 1-2 sentences, intriguing summary}</p>
    <a href="${tool.url}" class="hero-cta" target="_blank" rel="nofollow sponsored">{CTA_BUTTON_TEXT}</a>
  </div>
</div>

<div class="meta">
  <div class="container">{CURRENT_MONTH} 2026 · By AI Best Find Review Team · {READ_TIME} min read</div>
</div>

<div class="container content">

<a href="/" class="back-link">← Back to AI Best Find</a>

<div class="affiliate-disclosure">
  <span class="icon">💡</span>
  <span><strong>Editorial Note:</strong> This is an independent review. We are not affiliated with ${tool.nameEn}. Our evaluations are based on hands-on testing and remain honest — we only recommend tools we've actually used.</span>
</div>

<!-- WRITE 5-8 DETAILED SECTIONS HERE with h2/h3 headings, paragraphs, data-boxes, lists -->

<!-- REQUIRED SECTIONS:
1. Hook section: Why this tool matters, market context
2. "At a Glance" data-box with 6 flag-items summarizing key specs
3. 2-3 "deep dive" sections on the tool's key features
4. Pricing section with data-box
5. A comparison or use-case section
6. Pros/Cons grid
7. "The Bottom Line" verdict section
8. CTA section at the end
-->

<div class="pros-cons">
  <div class="pros">
    <h4>✅ What We Like</h4>
    <ul>
      <li>...</li>
      <!-- 4-6 genuine pros -->
    </ul>
  </div>
  <div class="cons">
    <h4>⚠️ Considerations</h4>
    <ul>
      <li>...</li>
      <!-- 3-5 honest limitations -->
    </ul>
  </div>
</div>

<!-- BOTTOM LINE section -->

<div class="cta-section">
  <h3>{FINAL_CTA_HEADING}</h3>
  <p style="color:#9a9ac0;margin-bottom:20px">{FINAL_CTA_SUBTEXT}</p>
  <a href="${tool.url}" class="cta-btn" target="_blank" rel="nofollow sponsored">{FINAL_CTA_BUTTON}</a>
</div>

</div>
</body>
</html>

=== COLOR PALETTE GUIDELINES ===
Choose ONE accent color family based on the tool category:
- Coding/Dev tools → Indigo/Blue: ACCENT_DARK=#4338ca, ACCENT=#6366f1, HERO_GRADIENT=#0f172a 0%,#1e1b4b 50%,#172554 100%, HERO_BORDER_COLOR=#1e293b, BADGE_BG=rgba(99,102,241,.2), BADGE_COLOR=#a5b4fc, HERO_H1_STYLE=color:#f1f5f9, HERO_P_COLOR=#94a3b8, HIGHLIGHT_BG=rgba(99,102,241,.08), DATA_BOX_BG=rgba(99,102,241,.04),rgba(139,92,246,.02), FLAG_ITEM_BG=rgba(99,102,241,.03), CTA_SECTION_BG=rgba(99,102,241,.06),rgba(245,158,11,.03)
- Creative/Design tools → Purple: ACCENT_DARK=#7c3aed, ACCENT=#8b5cf6, HERO_GRADIENT=#faf5ff 0%,#f3e8ff 50%,#fafbfc 100%, HERO_BORDER_COLOR=#e5e7eb, BADGE_BG=rgba(139,92,246,.1), BADGE_COLOR=#7c3aed, HERO_H1_STYLE=background:linear-gradient(135deg,#111827,#7c3aed,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text, HERO_P_COLOR=#4b5563, HIGHLIGHT_BG=rgba(139,92,246,.08), DATA_BOX_BG=rgba(139,92,246,.04),rgba(167,139,250,.02), FLAG_ITEM_BG=rgba(139,92,246,.03), CTA_SECTION_BG=rgba(139,92,246,.06),rgba(245,158,11,.03)
- Writing/Productivity → Emerald: ACCENT_DARK=#059669, ACCENT=#10b981, HERO_GRADIENT=#ecfdf5 0%,#d1fae5 50%,#fafbfc 100%, HERO_BORDER_COLOR=#e5e7eb, BADGE_BG=rgba(16,185,129,.1), BADGE_COLOR=#059669, HERO_H1_STYLE=background:linear-gradient(135deg,#111827,#059669,#34d399);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text, HERO_P_COLOR=#4b5563, HIGHLIGHT_BG=rgba(16,185,129,.08), DATA_BOX_BG=rgba(16,185,129,.04),rgba(52,211,153,.02), FLAG_ITEM_BG=rgba(16,185,129,.03), CTA_SECTION_BG=rgba(16,185,129,.06),rgba(245,158,11,.03)
- Audio/Video/Media → Rose/Pink: ACCENT_DARK=#be185d, ACCENT=#db2777, HERO_GRADIENT=#fdf2f8 0%,#fce7f3 50%,#fafbfc 100%, HERO_BORDER_COLOR=#e5e7eb, BADGE_BG=rgba(219,39,119,.1), BADGE_COLOR=#be185d, HERO_H1_STYLE=background:linear-gradient(135deg,#111827,#be185d,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text, HERO_P_COLOR=#4b5563, HIGHLIGHT_BG=rgba(219,39,119,.08), DATA_BOX_BG=rgba(219,39,119,.04),rgba(244,114,182,.02), FLAG_ITEM_BG=rgba(219,39,119,.03), CTA_SECTION_BG=rgba(219,39,119,.06),rgba(245,158,11,.03)
- Search/Knowledge → Amber/Orange: ACCENT_DARK=#b45309, ACCENT=#d97706, HERO_GRADIENT=#fffbeb 0%,#fef3c7 30%,#fafbfc 100%, HERO_BORDER_COLOR=#e5e7eb, BADGE_BG=rgba(217,119,6,.1), BADGE_COLOR=#b45309, HERO_H1_STYLE=background:linear-gradient(135deg,#111827,#b45309,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text, HERO_P_COLOR=#4b5563, HIGHLIGHT_BG=rgba(217,119,6,.08), DATA_BOX_BG=rgba(217,119,6,.04),rgba(245,158,11,.02), FLAG_ITEM_BG=rgba(217,119,6,.03), CTA_SECTION_BG=rgba(217,119,6,.06),rgba(245,158,11,.03)

=== CONTENT GUIDELINES ===
- Write with the authority of someone who has actually used the tool extensively
- Include specific version numbers, dates, pricing, and metrics where real
- Be balanced: 4-6 pros AND 3-5 honest limitations
- Use real facts about the tool — if unsure about a specific capability, be general
- SEO-optimize the title, h2 headings, and meta description
- The article should feel like it took days of testing to write`;
}

function buildUserPrompt(tool) {
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now = new Date();
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();

  return `Write a complete review article for this AI tool:

**Tool Name:** ${tool.nameEn}
**Category:** ${tool.categoryEn || tool.category}
**Official URL:** ${tool.url}
**Icon Emoji:** ${tool.icon}
**Short Description:** ${tool.descEn}

**Current Date Context:** ${month} ${year}

Generate the FULL HTML file now. Follow the template EXACTLY.

Additional requirements:
- Hero badge text: "{tool.icon} ${tool.categoryEn || tool.category} · In-Depth Review"
- CTA button text: "🚀 Try ${tool.nameEn} Now →" (or "🎨" / "🎧" etc. based on category)
- Read time: estimate based on content length (typically 6-8 min)
- Include a "data-box" with 6 key features as flag-items
- Include at least one real testimonial or quote from a known industry figure (if available)
- The article MUST be comprehensive — think "the definitive review"

OUTPUT ONLY THE HTML. NO MARKDOWN. NO CODE FENCES.`;
}

// ========= 主流程 =========

async function main() {
  console.log('=== AI Tool Review Generator ===\n');

  // 1. 获取已有评测
  const existing = getExistingReviews();
  console.log(`Existing reviews (${existing.size}): ${[...existing].join(', ')}`);

  // 2. 读取待评测工具
  const allTools = getTools();
  if (allTools.length === 0) {
    console.log('No tools in tools.json — nothing to review. Exiting.');
    process.exit(0);
  }

  // 3. 去重
  const unreviewed = allTools.filter(t => {
    const slug = slugify(t.nameEn);
    return !existing.has(slug);
  });

  if (unreviewed.length === 0) {
    console.log('All tools have been reviewed! Add new tools to tools.json.');
    process.exit(0);
  }

  console.log(`Unreviewed tools (${unreviewed.length}): ${unreviewed.map(t => t.nameEn).join(', ')}`);

  // 4. 选下一个（按 date 最新优先）
  unreviewed.sort((a, b) => (b.date || '2026-01-01').localeCompare(a.date || '2026-01-01'));
  const picked = unreviewed[0];
  const slug = slugify(picked.nameEn);

  console.log(`\n📝 Selected: ${picked.nameEn} (${picked.categoryEn || picked.category})`);
  console.log(`   Slug: ${slug}`);
  console.log(`   URL: ${picked.url}`);

  // 5. 调用 DeepSeek 生成文章
  console.log('\n🤖 Calling DeepSeek to generate review...');
  const systemPrompt = buildSystemPrompt(picked);
  const userPrompt = buildUserPrompt(picked);

  let html;
  try {
    const raw = await deepseekChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    // 清理输出：移除可能的 markdown 代码块包装
    html = raw.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/, '').trim();
    if (!html.startsWith('<!DOCTYPE html>') && !html.startsWith('<')) {
      throw new Error('DeepSeek output does not look like HTML');
    }
    console.log(`   Generated ${html.length.toLocaleString()} chars`);
  } catch (err) {
    console.error('DeepSeek generation failed:', err.message);
    process.exit(1);
  }

  // 6. 写入文件
  const reviewDir = path.join(POSTS_DIR, slug);
  if (!fs.existsSync(reviewDir)) fs.mkdirSync(reviewDir, { recursive: true });
  const indexPath = path.join(reviewDir, 'index.html');
  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log(`✅ Written: posts/${slug}/index.html`);

  // 7. 更新 index.html
  console.log('\n📄 Updating index.html...');
  let indexHtml = fs.readFileSync(INDEX_PATH, 'utf-8');

  // 生成中英文标题
  const monthAbbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][new Date().getMonth()];
  const enTitle = `${picked.nameEn} Review: AI-Powered ${picked.categoryEn || 'Tool'} — Hands-On Test ${monthAbbr} ${new Date().getFullYear()}`;
  const zhTitle = `${picked.nameZh} 深度评测：AI${picked.category || '工具'}实测报告 — ${new Date().getFullYear()}年${new Date().getMonth()+1}月`;

  // 添加 articleTitle
  indexHtml = addArticleTitle(indexHtml, slug, enTitle, zhTitle);
  console.log(`   Added articleTitles entry for "${slug}"`);

  // 添加 staticTool
  indexHtml = addStaticTool(indexHtml, {
    slug,
    icon: picked.icon,
    nameEn: picked.nameEn,
    nameZh: picked.nameZh,
    descEn: picked.descEn,
    descZh: picked.descZh
  });
  console.log(`   Added staticTools entry for "${slug}"`);

  fs.writeFileSync(INDEX_PATH, indexHtml, 'utf-8');
  console.log('✅ index.html updated');

  // 8. 从 tools.json 移除
  console.log('\n🗑️  Removing from tools.json...');
  const remaining = allTools.filter(t => slugify(t.nameEn) !== slug);
  fs.writeFileSync(TOOLS_PATH, JSON.stringify(remaining, null, 2), 'utf-8');
  console.log(`   tools.json: ${allTools.length} → ${remaining.length} tools`);

  // 9. 输出结果
  console.log('\n=== GENERATION COMPLETE ===');
  console.log(`Tool:     ${picked.nameEn}`);
  console.log(`Slug:     ${slug}`);
  console.log(`Category: ${picked.categoryEn || picked.category}`);
  console.log(`Size:     ${html.length.toLocaleString()} chars`);
  console.log(`Remaining unreviewed tools: ${remaining.length}`);
}

main().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
