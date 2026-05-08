/**
 * fetch-ai-news.mjs
 * 每天上午10点和晚上10点执行
 * 从多个RSS源获取最新AI资讯，提取要点生成中文资讯简报文章
 */
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');
const NEWS_DIR = path.join(ROOT, 'news');
const NEWS_INDEX_PATH = path.join(ROOT, 'news-index.json');

// ========= RSS 数据源 =========
const RSS_SOURCES = [
  {
    name: 'TechCrunch AI',
    url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
    lang: 'en'
  },
  {
    name: 'The Verge AI',
    url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml',
    lang: 'en'
  },
  {
    name: 'VentureBeat AI',
    url: 'https://venturebeat.com/category/ai/feed/',
    lang: 'en'
  },
  {
    name: 'MIT Tech Review AI',
    url: 'https://www.technologyreview.com/feed/',
    lang: 'en'
  }
];

// ========= 通用HTTP请求 =========
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpGet(res.headers.location).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ========= RSS/Atom 解析 =========
function decodeHTMLEntities(str) {
  if (!str) return '';
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function stripHTML(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? decodeHTMLEntities(stripHTML(match[1])) : '';
}

function parseRSS(xml) {
  const items = [];
  // RSS 2.0
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];
    const title = extractTag(itemXml, 'title');
    const link = extractTag(itemXml, 'link');
    const description = extractTag(itemXml, 'description');
    const pubDate = extractTag(itemXml, 'pubDate');
    if (title && link) {
      items.push({ title, link, description, pubDate });
    }
  }
  return items;
}

function parseAtom(xml) {
  const items = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
  let match;
  while ((match = entryRegex.exec(xml)) !== null) {
    const entryXml = match[1];
    const title = extractTag(entryXml, 'title');
    const summary = extractTag(entryXml, 'summary') || extractTag(entryXml, 'content');
    const published = extractTag(entryXml, 'published') || extractTag(entryXml, 'updated');
    // Atom link: <link href="..." />
    const linkMatch = entryXml.match(/<link[^>]*href="([^"]*)"[^>]*\/?>/i);
    const link = linkMatch ? linkMatch[1] : '';
    if (title && link) {
      items.push({ title, link, description: summary, pubDate: published });
    }
  }
  return items;
}

function parseFeed(xml) {
  if (xml.includes('<feed ') || xml.includes('<feed>') || xml.includes('xmlns="http://www.w3.org/2005/Atom"')) {
    return parseAtom(xml);
  }
  return parseRSS(xml);
}

// ========= 获取所有新闻 =========
async function fetchAllNews() {
  const allItems = [];

  for (const source of RSS_SOURCES) {
    try {
      console.log(`Fetching: ${source.name} (${source.url})`);
      const xml = await httpGet(source.url);
      const items = parseFeed(xml);
      console.log(`  Got ${items.length} items from ${source.name}`);

      for (const item of items) {
        allItems.push({
          ...item,
          source: source.name
        });
      }
    } catch (err) {
      console.log(`  FAILED ${source.name}: ${err.message}`);
    }
  }

  // 去重（按URL）
  const seen = new Set();
  const unique = allItems.filter(item => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });

  // 按日期排序（最新的在前）
  unique.sort((a, b) => {
    const da = new Date(a.pubDate);
    const db = new Date(b.pubDate);
    if (isNaN(da) && isNaN(db)) return 0;
    if (isNaN(da)) return 1;
    if (isNaN(db)) return -1;
    return db - da;
  });

  // 取最新的20条
  const latest = unique.slice(0, 20);
  console.log(`Total unique: ${unique.length}, using latest ${latest.length}`);

  return latest;
}

// ========= 获取北京时间 =========
function getBeijingTime() {
  const now = new Date();
  // 北京时间 UTC+8
  const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const y = beijing.getUTCFullYear();
  const m = String(beijing.getUTCMonth() + 1).padStart(2, '0');
  const d = String(beijing.getUTCDate()).padStart(2, '0');
  const h = String(beijing.getUTCHours()).padStart(2, '0');
  return {
    dateStr: `${y}-${m}-${d}`,
    timeStr: `${h}:00`,
    year: y, month: m, day: d, hour: beijing.getUTCHours()
  };
}

// ========= DeepSeek API 调用 =========
function callDeepSeek(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一位资深AI行业编辑，擅长从大量资讯中提取核心要点，撰写专业、简洁、易读的中文科技资讯简报。'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const options = {
      hostname: 'api.deepseek.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.DEEPSEEK_API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`API ${res.statusCode}: ${data.substring(0, 300)}`));
          return;
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Parse error: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ========= 生成文章 =========
async function generateArticle(newsItems, slot) {
  const time = getBeijingTime();
  const slotLabel = slot === 'morning' ? '早报' : '晚报';
  const slotLabelEn = slot === 'morning' ? 'Morning Brief' : 'Evening Brief';
  const titleEn = `AI News ${slotLabelEn} | ${time.dateStr}`;
  const titleZh = `AI资讯${slotLabel} | ${time.dateStr}`;
  const articleTitle = titleEn;
  const slug = `news-${time.dateStr}-${slot}`;

  // 构建新闻列表文本供AI处理
  const newsText = newsItems.map((item, i) => {
    let text = `[${i + 1}] Title: ${item.title}\n`;
    text += `    Source: ${item.source}\n`;
    text += `    Link: ${item.link}\n`;
    text += `    Date: ${item.pubDate}\n`;
    text += `    Summary: ${item.description.substring(0, 300)}\n`;
    return text;
  }).join('\n');

  const prompt =
    `Please write an English-language AI news digest based on the following latest AI industry news.\n\n` +
    `Requirements:\n` +
    `1. Select the 8-10 most important stories from the list below and rank by significance\n` +
    `2. For each story include: [Title] + [Key Insights] (2-3 sentences) + [Source]\n` +
    `3. Start with a brief overview (80-100 words) summarizing today's AI landscape\n` +
    `4. Output pure HTML using these tags: <h2> for section headers, <h3> for each story title, <p> for body, <ul>/<li> for bullet points\n` +
    `5. Preserve the original source link at the end of each story\n` +
    `6. Tone: professional, editorial, highly readable — write like The Verge or TechCrunch\n` +
    `7. Total length: 1500-2000 words\n\n` +
    `Today's AI news feed:\n\n` + newsText;

  console.log(`Calling DeepSeek API for ${slotLabel}...`);
  const data = await callDeepSeek(prompt);
  const raw = data.choices[0].message.content;

  // 提取标题行（如果有）
  let bodyHtml = raw;
  let title = articleTitle;
  const lines = raw.split('\n');
  if (lines[0] && lines[0].includes('TITLE||')) {
    title = lines[0].replace('TITLE||', '').trim();
    bodyHtml = lines.slice(1).join('\n');
  }

  // 确保news目录存在
  if (!fs.existsSync(NEWS_DIR)) {
    fs.mkdirSync(NEWS_DIR, { recursive: true });
  }

  // 去重：如果文件已存在则跳过
  const filePath = path.join(NEWS_DIR, slug + '.html');
  if (fs.existsSync(filePath)) {
    console.log(`SKIP: ${slug}.html already exists`);
    return null;
  }

  // 生成完整HTML
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleEn} | AI Best Find</title>
  <meta name="description" content="AI News Digest - ${time.dateStr}, curated key insights from global AI industry developments">
  <link rel="canonical" href="https://aibestfind.com/news/${slug}.html">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafbfc;color:#111827;line-height:1.85;max-width:820px;margin:0 auto;padding:32px 20px 60px}
    .back-link{display:inline-block;color:#9ca3af;text-decoration:none;font-size:.95em;margin-bottom:28px;transition:.2s}
    .back-link:hover{color:#6366f1}
    .post-meta{display:flex;align-items:center;gap:10px;margin-bottom:12px;color:#9ca3af;font-size:.9em}
    .slot-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 12px;border-radius:12px;font-size:.85em;font-weight:600}
    .slot-badge.morning{background:rgba(245,158,11,.1);color:#d97706}
    .slot-badge.evening{background:rgba(99,102,241,.1);color:#4338ca}
    h1{font-size:1.8em;font-weight:900;color:#111827;margin-bottom:8px;line-height:1.3}
    .overview{background:linear-gradient(135deg,rgba(99,102,241,.04),rgba(139,92,246,.02));border:1px solid #e5e7eb;border-radius:14px;padding:24px;margin:24px 0;color:#4b5563;font-size:.95em;line-height:1.7}
    .divider{border:none;border-top:1px solid #e5e7eb;margin:8px 0 24px}
    h2{font-size:1.4em;color:#4338ca;margin:36px 0 16px;padding-bottom:8px;border-bottom:2px solid #e5e7eb}
    h3{font-size:1.1em;color:#111827;margin:22px 0 10px;display:flex;align-items:baseline;gap:8px}
    h3 .num{color:#6366f1;font-size:.85em;font-weight:800}
    p{color:#4b5563;margin-bottom:12px}
    ul{margin:10px 0 16px 20px}
    li{color:#4b5563;margin-bottom:6px}
    .key-point{background:rgba(99,102,241,.04);border-left:3px solid #6366f1;padding:14px 18px;margin:14px 0;border-radius:0 8px 8px 0;font-size:.92em}
    .key-point strong{color:#4338ca}
    .source-link{display:inline-block;font-size:.85em;color:#9ca3af;text-decoration:none;margin-top:6px;padding:3px 10px;border:1px solid #e5e7eb;border-radius:6px;transition:.2s}
    .source-link:hover{background:#f3f4f6;border-color:#6366f1;color:#6366f1}
    .news-card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:24px;margin:20px 0;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.04)}
    .news-card:hover{border-color:rgba(99,102,241,.2);box-shadow:0 4px 20px rgba(0,0,0,.06)}
    .footer{margin-top:48px;padding-top:24px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:.85em;text-align:center}
    .footer a{color:#6366f1;text-decoration:none}
    .footer a:hover{text-decoration:underline}
    @media(max-width:600px){body{padding:20px 16px}h1{font-size:1.4em}.news-card{padding:18px}}
  </style>
</head>
<body>
  <a class="back-link" href="/">← Back to AI Best Find</a>
  <div class="post-meta">
    <span>${time.dateStr}</span>
    <span class="slot-badge slot-${slot}">${slotLabelEn}</span>
  </div>
  <h1>${titleEn}</h1>
  <hr class="divider">
${bodyHtml}
  <div class="footer">
    <p>AI Best Find Daily Digest — Curated key insights from global AI news.</p>
    <p style="margin-top:8px"><a href="/">Back to Home</a> · <a href="/sitemap.xml">Sitemap</a></p>
  </div>
</body>
</html>`;

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`Generated: news/${slug}.html`);

  // 提取标题列表用于索引
  const headlines = [];
  const h3Regex = /<h3>(.*?)<\/h3>/gi;
  let h3Match;
  while ((h3Match = h3Regex.exec(bodyHtml)) !== null) {
    const h3Text = stripHTML(h3Match[1]).trim();
    if (h3Text.length > 5 && h3Text.length < 120) {
      headlines.push(h3Text);
    }
  }

  return {
    date: time.dateStr,
    slot,
    slotLabel,
    titleEn,
    titleZh,
    title: titleEn,
    slug,
    headlines
  };
}

// ========= 更新news-index.json =========
function updateNewsIndex(newEntry) {
  let index = [];
  if (fs.existsSync(NEWS_INDEX_PATH)) {
    try {
      index = JSON.parse(fs.readFileSync(NEWS_INDEX_PATH, 'utf-8'));
    } catch (e) {
      index = [];
    }
  }

  // 去重
  const existing = index.find(e => e.slug === newEntry.slug);
  if (existing) {
    console.log(`News index already has entry: ${newEntry.slug}`);
    return;
  }

  index.unshift(newEntry);

  // 只保留最近60条
  if (index.length > 60) {
    index = index.slice(0, 60);
  }

  fs.writeFileSync(NEWS_INDEX_PATH, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`News index updated: ${index.length} entries`);
}

// ========= 清理旧脚本生成的文章 =========
// (保留旧文章，不做删除)

// ========= 主流程 =========
async function main() {
  const slot = process.env.SLOT || 'morning';

  if (!['morning', 'evening'].includes(slot)) {
    console.error('SLOT must be "morning" or "evening"');
    process.exit(1);
  }

  console.log(`=== AI News Fetch: ${slot} ===`);
  console.log(`Time (Beijing): ${getBeijingTime().dateStr} ${getBeijingTime().timeStr}`);

  // 1. 获取新闻
  let newsItems;
  try {
    newsItems = await fetchAllNews();
  } catch (err) {
    console.error('Failed to fetch news:', err.message);
    process.exit(1);
  }

  if (newsItems.length === 0) {
    console.log('No news items found, skipping article generation.');
    process.exit(0);
  }

  // 2. 生成文章
  try {
    const entry = await generateArticle(newsItems, slot);
    if (entry) {
      // 3. 更新索引
      updateNewsIndex(entry);
    }
  } catch (err) {
    console.error('Failed to generate article:', err.message);
    process.exit(1);
  }

  console.log('=== Done ===');
}

main();
