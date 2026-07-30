/**
 * update-sitemap.mjs
 * 扫描 posts/ 和 news/ 目录，更新 sitemap.xml
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');
const POSTS_DIR = path.join(ROOT, 'posts');
const NEWS_DIR = path.join(ROOT, 'news');

// ========= 从HTML提取标题和日期 =========
function extractMeta(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let title = '';
  let date = '';

  // 尝试从 <title> 提取
  const titleMatch = content.match(/<title>([^<]*)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
    // 去掉 " | AI Best Find" 后缀
    title = title.replace(/\s*\|\s*AI Best Find\s*$/i, '');
  }

  // 尝试从 <h1> 提取
  if (!title) {
    const h1Match = content.match(/<h1>([^<]*)<\/h1>/i);
    if (h1Match) title = h1Match[1].trim();
  }

  // 提取日期
  const dateMatch = content.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) date = dateMatch[1];

  // 尝试从 meta 提取日期
  if (!date) {
    const metaDate = content.match(/<meta[^>]*date[^>]*content="([^"]*)"[^>]*>/i);
    if (metaDate) date = metaDate[1];
  }

  return { title, date };
}

// ========= 生成 sitemap.xml =========
function generateSitemap(posts) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  xml += '  <url>\n';
  xml += '    <loc>https://www.aibestfind.com/</loc>\n';
  xml += '    <priority>1.0</priority>\n';
  xml += '  </url>';

  posts.forEach(p => {
    const prefix = p.pathPrefix || 'posts';
    // posts 使用子目录结构: /posts/slug/  (web server 会解析到 /posts/slug/index.html)
    // news 使用平铺文件: /news/slug.html
    const loc = prefix === 'posts'
      ? 'https://www.aibestfind.com/' + prefix + '/' + p.slug + '/'
      : 'https://www.aibestfind.com/' + prefix + '/' + p.slug + '.html';
    xml += '\n  <url>\n';
    xml += '    <loc>' + loc + '</loc>\n';
    if (p.date) {
      xml += '    <lastmod>' + p.date + '</lastmod>\n';
    }
    xml += '    <priority>0.6</priority>\n';
    xml += '  </url>';
  });

  xml += '\n</urlset>';
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf-8');
  console.log('Sitemap generated with ' + posts.length + ' posts');
}

// ========= Main =========
const posts = [];

// 扫描评测文章目录 (子目录结构: posts/tool-name/index.html)
if (fs.existsSync(POSTS_DIR)) {
  const entries = fs.readdirSync(POSTS_DIR, { withFileTypes: true });
  entries.filter(e => e.isDirectory()).sort().reverse().forEach(entry => {
    const slug = entry.name;
    const indexPath = path.join(POSTS_DIR, slug, 'index.html');
    if (fs.existsSync(indexPath)) {
      const { title, date } = extractMeta(indexPath);
      const displayTitle = title || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      posts.push({ slug, title: displayTitle, date, pathPrefix: 'posts' });
    }
  });
}

// 扫描AI资讯目录 (平铺文件: news/news-YYYY-MM-DD-slot.html)
if (fs.existsSync(NEWS_DIR)) {
  const files = fs.readdirSync(NEWS_DIR)
    .filter(f => f.endsWith('.html'))
    .sort()
    .reverse();

  files.forEach(file => {
    const slug = file.replace('.html', '');
    const filePath = path.join(NEWS_DIR, file);
    const { title, date } = extractMeta(filePath);
    const displayTitle = title || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    posts.push({ slug, title: displayTitle, date, pathPrefix: 'news' });
  });
}

generateSitemap(posts);
