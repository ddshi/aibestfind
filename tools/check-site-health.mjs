/**
 * check-site-health.mjs — AI Best Find site health checker
 * Usage: node tools/check-site-health.mjs
 * Checks homepage, sitemap, and latest news page are accessible.
 */
import https from 'https';

const SITE = 'https://aibestfind.com';
const CHECKS = [
  { url: SITE + '/', label: 'Homepage' },
  { url: SITE + '/sitemap.xml', label: 'Sitemap' },
];

function checkUrl(url, label) {
  return new Promise((resolve) => {
    const start = Date.now();
    https.get(url, { timeout: 10000 }, (res) => {
      const ms = Date.now() - start;
      const ok = res.statusCode >= 200 && res.statusCode < 400;
      resolve({ label, url, status: res.statusCode, ms, ok });
    }).on('error', (err) => {
      resolve({ label, url, status: 'ERROR', ms: Date.now() - start, ok: false, error: err.message });
    });
  });
}

async function main() {
  console.log(`\n🔍 AI Best Find Health Check — ${new Date().toISOString()}\n`);

  // Add latest news check
  const fs = await import('fs');
  const indexPath = 'D:/openclaw/public/aibestfind/news-index.json';
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    if (index.length > 0) {
      CHECKS.push({
        url: SITE + '/news/' + index[0].slug + '.html',
        label: 'Latest News: ' + index[0].slug,
      });
    }
  }

  const results = [];
  for (const check of CHECKS) {
    const r = await checkUrl(check.url, check.label);
    results.push(r);
    const icon = r.ok ? '✅' : '❌';
    console.log(`${icon} ${r.label} — HTTP ${r.status} (${r.ms}ms)`);
    if (r.error) console.log(`   ⚠️ ${r.error}`);
  }

  const allOk = results.every(r => r.ok);
  console.log(`\n${allOk ? '🟢 All checks passed' : '🔴 Some checks failed'}\n`);
  process.exit(allOk ? 0 : 1);
}

main();
