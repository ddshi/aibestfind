/**
 * fix-hero-colors.mjs
 * Fix amber/yellow hero backgrounds → clean readable colors
 * Also cleanup layout inconsistencies
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '..', '..', 'posts');

// Each page gets a clean, readable hero color scheme
const FIXES = [
  {
    slug: 'perplexity-ai',
    heroBg: '#f5f3ff 0%,#ede9fe 30%,#fafbfc 100%',
    accentColor: '#7c3aed',
    accentLight: '#8b5cf6',
    accentBg: 'rgba(124,58,237,.08)',
    badgeBg: 'rgba(124,58,237,.1)',
    badgeColor: '#6d28d9',
    h2Color: '#7c3aed',
    h3Color: '#8b5cf6',
    h1Gradient: 'linear-gradient(135deg,#111827,#7c3aed,#8b5cf6)',
    ctaBg: 'linear-gradient(135deg,#7c3aed,#8b5cf6)',
    ctaHover: 'rgba(124,58,237,.3)',
    dataBoxBg: 'linear-gradient(135deg,rgba(124,58,237,.04),rgba(139,92,246,.02))',
    dataBoxH3: '#7c3aed',
    flagBg: 'rgba(124,58,237,.03)',
    testimonialBg: 'rgba(124,58,237,.06)',
    testimonialBorder: '#7c3aed',
    testimonialAuthor: '#6d28d9',
    highlightBg: 'rgba(124,58,237,.08)',
    highlightColor: '#7c3aed',
    ctaSectBg: 'linear-gradient(135deg,rgba(124,58,237,.06),rgba(139,92,246,.03))',
    ctaSectH3: '#7c3aed',
    backHover: '#7c3aed',
    affiliateBg: 'rgba(124,58,237,.04)',
    affiliateBorder: 'rgba(124,58,237,.15)',
    affiliateColor: '#5b21b6',
  },
  {
    slug: 'google-gemini',
    heroBg: '#eff6ff 0%,#dbeafe 30%,#fafbfc 100%',
    accentColor: '#2563eb',
    accentLight: '#3b82f6',
    accentBg: 'rgba(37,99,235,.08)',
    badgeBg: 'rgba(37,99,235,.1)',
    badgeColor: '#1d4ed8',
    h2Color: '#2563eb',
    h3Color: '#3b82f6',
    h1Gradient: 'linear-gradient(135deg,#111827,#2563eb,#3b82f6)',
    ctaBg: 'linear-gradient(135deg,#2563eb,#3b82f6)',
    ctaHover: 'rgba(37,99,235,.3)',
    dataBoxBg: 'linear-gradient(135deg,rgba(37,99,235,.04),rgba(59,130,246,.02))',
    dataBoxH3: '#2563eb',
    flagBg: 'rgba(37,99,235,.03)',
    testimonialBg: 'rgba(37,99,235,.06)',
    testimonialBorder: '#2563eb',
    testimonialAuthor: '#1d4ed8',
    highlightBg: 'rgba(37,99,235,.08)',
    highlightColor: '#2563eb',
    ctaSectBg: 'linear-gradient(135deg,rgba(37,99,235,.06),rgba(59,130,246,.03))',
    ctaSectH3: '#2563eb',
    backHover: '#2563eb',
    affiliateBg: 'rgba(37,99,235,.04)',
    affiliateBorder: 'rgba(37,99,235,.15)',
    affiliateColor: '#1e40af',
  },
  {
    slug: 'glean',
    heroBg: '#f8fafc 0%,#e2e8f0 30%,#fafbfc 100%',
    accentColor: '#475569',
    accentLight: '#64748b',
    accentBg: 'rgba(71,85,105,.08)',
    badgeBg: 'rgba(71,85,105,.1)',
    badgeColor: '#334155',
    h2Color: '#475569',
    h3Color: '#64748b',
    h1Gradient: 'linear-gradient(135deg,#111827,#475569,#64748b)',
    ctaBg: 'linear-gradient(135deg,#475569,#64748b)',
    ctaHover: 'rgba(71,85,105,.3)',
    dataBoxBg: 'linear-gradient(135deg,rgba(71,85,105,.04),rgba(100,116,139,.02))',
    dataBoxH3: '#475569',
    flagBg: 'rgba(71,85,105,.03)',
    testimonialBg: 'rgba(71,85,105,.06)',
    testimonialBorder: '#475569',
    testimonialAuthor: '#334155',
    highlightBg: 'rgba(71,85,105,.08)',
    highlightColor: '#475569',
    ctaSectBg: 'linear-gradient(135deg,rgba(71,85,105,.06),rgba(100,116,139,.03))',
    ctaSectH3: '#475569',
    backHover: '#475569',
    affiliateBg: 'rgba(71,85,105,.04)',
    affiliateBorder: 'rgba(71,85,105,.15)',
    affiliateColor: '#334155',
  },
  {
    slug: 'pinecone',
    heroBg: '#f0fdf4 0%,#dcfce7 30%,#fafbfc 100%',
    accentColor: '#059669',
    accentLight: '#10b981',
    accentBg: 'rgba(5,150,105,.08)',
    badgeBg: 'rgba(5,150,105,.1)',
    badgeColor: '#047857',
    h2Color: '#059669',
    h3Color: '#10b981',
    h1Gradient: 'linear-gradient(135deg,#111827,#059669,#10b981)',
    ctaBg: 'linear-gradient(135deg,#059669,#10b981)',
    ctaHover: 'rgba(5,150,105,.3)',
    dataBoxBg: 'linear-gradient(135deg,rgba(5,150,105,.04),rgba(16,185,129,.02))',
    dataBoxH3: '#059669',
    flagBg: 'rgba(5,150,105,.03)',
    testimonialBg: 'rgba(5,150,105,.06)',
    testimonialBorder: '#059669',
    testimonialAuthor: '#047857',
    highlightBg: 'rgba(5,150,105,.08)',
    highlightColor: '#059669',
    ctaSectBg: 'linear-gradient(135deg,rgba(5,150,105,.06),rgba(16,185,129,.03))',
    ctaSectH3: '#059669',
    backHover: '#059669',
    affiliateBg: 'rgba(5,150,105,.04)',
    affiliateBorder: 'rgba(5,150,105,.15)',
    affiliateColor: '#064e3b',
  },
  {
    slug: 'agenticagency',
    heroBg: '#fef2f2 0%,#fee2e2 30%,#fafbfc 100%',
    accentColor: '#dc2626',
    accentLight: '#f87171',
    accentBg: 'rgba(220,38,38,.08)',
    badgeBg: 'rgba(220,38,38,.1)',
    badgeColor: '#b91c1c',
    h2Color: '#dc2626',
    h3Color: '#ef4444',
    h1Gradient: 'linear-gradient(135deg,#111827,#dc2626,#ef4444)',
    ctaBg: 'linear-gradient(135deg,#dc2626,#ef4444)',
    ctaHover: 'rgba(220,38,38,.3)',
    dataBoxBg: 'linear-gradient(135deg,rgba(220,38,38,.04),rgba(239,68,68,.02))',
    dataBoxH3: '#dc2626',
    flagBg: 'rgba(220,38,38,.03)',
    testimonialBg: 'rgba(220,38,38,.06)',
    testimonialBorder: '#dc2626',
    testimonialAuthor: '#b91c1c',
    highlightBg: 'rgba(220,38,38,.08)',
    highlightColor: '#dc2626',
    ctaSectBg: 'linear-gradient(135deg,rgba(220,38,38,.06),rgba(239,68,68,.03))',
    ctaSectH3: '#dc2626',
    backHover: '#dc2626',
    affiliateBg: 'rgba(220,38,38,.04)',
    affiliateBorder: 'rgba(220,38,38,.15)',
    affiliateColor: '#991b1b',
  },
];

function replaceBetween(html, startMarker, endMarker, replacement) {
  const start = html.indexOf(startMarker);
  if (start === -1) return html;
  const end = html.indexOf(endMarker, start + startMarker.length);
  if (end === -1) return html;
  return html.substring(0, start) + replacement + html.substring(end + endMarker.length);
}

let updated = 0;
let errors = [];

for (const fix of FIXES) {
  const filePath = path.join(POSTS_DIR, fix.slug, 'index.html');
  if (!fs.existsSync(filePath)) {
    errors.push(`MISSING: ${fix.slug}`);
    continue;
  }

  let html = fs.readFileSync(filePath, 'utf-8');

  // 1. Hero background
  html = html.replace(
    /\.hero\{background:linear-gradient\(135deg,#fffbeb 0%,#fef3c7 \d+%,#fafbfc 100%\)/,
    `.hero{background:linear-gradient(135deg,${fix.heroBg})`
  );

  // 2. Hero badge  
  html = html.replace(
    /\.hero-badge\{[^}]*\}/,
    `.hero-badge{display:inline-block;padding:6px 20px;border-radius:50px;background:${fix.badgeBg};color:${fix.badgeColor};font-size:.85em;font-weight:600;margin-bottom:20px}`
  );

  // 3. Hero h1 gradient
  html = html.replace(
    /\.hero h1\{[^}]*\}/,
    `.hero h1{font-size:clamp(1.6em,4vw,2.4em);font-weight:900;line-height:1.3;margin-bottom:16px;color:#111827}`
  );

  // 4. CTA button
  html = html.replace(
    /\.hero-cta\{[^}]*\}/,
    `.hero-cta{display:inline-block;padding:14px 36px;border-radius:50px;background:${fix.ctaBg};color:#fff;font-weight:700;font-size:1em;text-decoration:none;margin-top:28px;transition:.3s}`
  );
  html = html.replace(
    /\.hero-cta:hover\{[^}]*\}/,
    `.hero-cta:hover{transform:translateY(-2px);box-shadow:0 8px 30px ${fix.ctaHover}}`
  );

  // 5. Content h2 color
  html = html.replace(
    /\.content h2\{[^}]*\}/,
    `.content h2{font-size:1.5em;font-weight:800;margin:48px 0 16px;color:${fix.h2Color}}`
  );

  // 6. Content h3 color
  html = html.replace(
    /\.content h3\{[^}]*\}/,
    `.content h3{font-size:1.15em;font-weight:700;margin:32px 0 12px;color:${fix.h3Color}}`
  );

  // 7. Data box
  html = html.replace(
    /\.data-box\{[^}]*\}/,
    `.data-box{background:${fix.dataBoxBg};border:1px solid #e5e7eb;border-radius:16px;padding:28px;margin:32px 0}`
  );
  html = html.replace(
    /\.data-box h3\{[^}]*\}/,
    `.data-box h3{margin-top:0;color:${fix.dataBoxH3}}`
  );

  // 8. Flag items
  html = html.replace(
    /\.flag-item\{[^}]*\}/,
    `.flag-item{text-align:center;padding:16px;background:${fix.flagBg};border-radius:12px;font-size:.9em}`
  );

  // 9. Testimonial
  html = html.replace(
    /\.testimonial\{[^}]*\}/,
    `.testimonial{background:${fix.testimonialBg};border-left:3px solid ${fix.testimonialBorder};padding:24px;border-radius:0 12px 12px 0;margin:28px 0}`
  );
  html = html.replace(
    /\.testimonial \.author\{[^}]*\}/,
    `.testimonial .author{color:${fix.testimonialAuthor};font-weight:600;font-size:.9em}`
  );

  // 10. Highlight
  html = html.replace(
    /\.highlight\{[^}]*\}/,
    `.highlight{background:${fix.highlightBg};padding:2px 8px;border-radius:4px;color:${fix.highlightColor};font-weight:600}`
  );

  // 11. CTA section
  html = html.replace(
    /\.cta-section\{[^}]*\}/,
    `.cta-section{text-align:center;padding:48px 24px;background:${fix.ctaSectBg};border:1px solid #e5e7eb;border-radius:16px;margin:48px 0}`
  );
  html = html.replace(
    /\.cta-section h3\{[^}]*\}/,
    `.cta-section h3{font-size:1.3em;margin-bottom:12px;color:${fix.ctaSectH3}}`
  );

  // 12. CTA button (bottom)
  html = html.replace(
    /\.cta-btn\{[^}]*\}/,
    `.cta-btn{display:inline-block;padding:16px 40px;border-radius:50px;background:${fix.ctaBg};color:#fff;font-weight:700;font-size:1.05em;text-decoration:none;transition:.3s;margin-top:16px}`
  );
  html = html.replace(
    /\.cta-btn:hover\{[^}]*\}/,
    `.cta-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px ${fix.ctaHover}}`
  );

  // 13. Back link hover
  html = html.replace(
    /\.back-link:hover\{[^}]*\}/,
    `.back-link:hover{color:${fix.backHover}}`
  );

  // 14. Affiliate disclosure
  html = html.replace(
    /\.affiliate-disclosure\{[^}]*\}/,
    `.affiliate-disclosure{background:${fix.affiliateBg};border:1px solid ${fix.affiliateBorder};border-radius:10px;padding:14px 20px;margin:20px 0 28px;font-size:.85em;color:${fix.affiliateColor};line-height:1.6;display:flex;align-items:flex-start;gap:10px}`
  );

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`✅ ${fix.slug}`);
  updated++;
}

console.log(`\n=== Fixed ${updated} pages ===`);
if (errors.length) { console.log('Errors:', errors); }
