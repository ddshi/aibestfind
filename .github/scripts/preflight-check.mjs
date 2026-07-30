#!/usr/bin/env node
/**
 * aibestfind 部署前质量检查
 * 检查所有 HTML 页面: U+FFFD乱码、标签配对、可见标签残片
 * 运行: node preflight-check.mjs
 */
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = resolve(__dirname, '..', '..');

function collectFiles(dir) {
  const files = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    if (!existsSync(d)) continue;
    const entries = readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      const fp = join(d, e.name);
      if (e.isDirectory()) stack.push(fp);
      else if (e.name.endsWith('.html')) files.push(fp);
    }
  }
  return files;
}

const files = collectFiles(BASE);
let passed = 0, failed = 0;

for (const fp of files) {
  const rel = fp.replace(BASE + '\\', '');
  let issues = [];

  // Check 1: U+FFFD
  const buf = readFileSync(fp);
  let ufffd = 0;
  for (let i = 0; i < buf.length - 2; i++) {
    if (buf[i] === 0xEF && buf[i + 1] === 0xBF && buf[i + 2] === 0xBD) ufffd++;
  }
  if (ufffd > 0) issues.push(`${ufffd} U+FFFD`);

  // Check 2: broken closing tags
  const html = readFileSync(fp, 'utf-8');
  const broken = html.match(/— \/[a-z]+\d*>/g);
  if (broken) issues.push(`${broken.length} broken tags`);

  // Check 3: div mismatch (only in body)
  const bodyM = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyM) {
    const body = bodyM[1];
    const openDiv = (body.match(/<div[\s>]/g) || []).length;
    const closeDiv = (body.match(/<\/div>/g) || []).length;
    if (openDiv !== closeDiv) issues.push(`div mismatch: ${openDiv}/${closeDiv}`);
  }

  if (issues.length > 0) {
    console.log(`❌ ${rel}: ${issues.join(', ')}`);
    failed++;
  } else {
    passed++;
  }
}

console.log(`\n${'='.repeat(50)}`);
if (failed === 0) {
  console.log(`✅ ALL ${passed} FILES PASSED — safe to commit`);
} else {
  console.log(`❌ ${failed} FILES FAILED — DO NOT COMMIT (${passed} passed)`);
  process.exit(1);
}
