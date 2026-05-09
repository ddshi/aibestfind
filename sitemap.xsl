<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:sm="http://www.sitemaps.org/schemas/sitemap/0.9">
<xsl:output method="html" encoding="UTF-8" indent="yes"/>
<xsl:template match="/">
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sitemap — AI Best Find</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fafbfc;color:#111827;line-height:1.7;max-width:820px;margin:0 auto;padding:48px 20px}
  .header{text-align:center;margin-bottom:40px}
  .header h1{font-size:1.8em;font-weight:900;background:linear-gradient(135deg,#111827,#6366f1,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
  .header p{color:#9ca3af;font-size:.95em;margin-top:8px}
  .stats{display:flex;gap:16px;justify-content:center;margin-bottom:36px;flex-wrap:wrap}
  .stat{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px 24px;text-align:center;min-width:100px}
  .stat .num{font-size:1.6em;font-weight:900;color:#6366f1}
  .stat .label{font-size:.8em;color:#9ca3af;margin-top:4px}
  table{width:100%;border-collapse:collapse;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04)}
  th{background:linear-gradient(135deg,#6366f1,#4338ca);color:#fff;padding:12px 16px;text-align:left;font-weight:600;font-size:.9em}
  td{padding:10px 16px;border-bottom:1px solid #e5e7eb;font-size:.9em}
  tr:nth-child(even) td{background:rgba(99,102,241,.02)}
  tr:hover td{background:rgba(99,102,241,.06)}
  a{color:#6366f1;text-decoration:none}
  a:hover{text-decoration:underline}
  .priority{display:inline-block;padding:2px 10px;border-radius:10px;font-size:.8em;font-weight:600}
  .p-high{background:rgba(16,185,129,.1);color:#059669}
  .p-mid{background:rgba(99,102,241,.1);color:#6366f1}
  .tag{display:inline-block;padding:2px 8px;border-radius:6px;font-size:.75em;background:rgba(245,158,11,.1);color:#d97706;margin-left:6px}
  .footer{margin-top:32px;text-align:center;color:#9ca3af;font-size:.85em}
  .footer a{color:#6366f1}
</style>
</head>
<body>
<div class="header">
  <h1>🗺️ AI Best Find Sitemap</h1>
  <p>All indexable pages on aibestfind.com</p>
</div>
<div class="stats">
  <div class="stat">
    <div class="num"><xsl:value-of select="count(sm:urlset/sm:url)"/></div>
    <div class="label">Total URLs</div>
  </div>
  <div class="stat">
    <div class="num"><xsl:value-of select="count(sm:urlset/sm:url[contains(sm:loc,'/posts/')])"/></div>
    <div class="label">Reviews</div>
  </div>
  <div class="stat">
    <div class="num"><xsl:value-of select="count(sm:urlset/sm:url[contains(sm:loc,'/news/')])"/></div>
    <div class="label">News</div>
  </div>
</div>
<table>
<thead>
  <tr><th>#</th><th>URL</th><th>Type</th><th>Last Modified</th><th>Priority</th></tr>
</thead>
<tbody>
<xsl:for-each select="sm:urlset/sm:url">
  <xsl:sort select="sm:priority" order="descending"/>
  <tr>
    <td style="color:#9ca3af;font-size:.85em"><xsl:value-of select="position()"/></td>
    <td>
      <a href="{sm:loc}"><xsl:value-of select="sm:loc"/></a>
      <xsl:choose>
        <xsl:when test="contains(sm:loc,'/posts/')"><span class="tag">Review</span></xsl:when>
        <xsl:when test="contains(sm:loc,'/news/')"><span class="tag">News</span></xsl:when>
        <xsl:otherwise><span class="tag">Home</span></xsl:otherwise>
      </xsl:choose>
    </td>
    <td style="color:#4b5563">
      <xsl:choose>
        <xsl:when test="contains(sm:loc,'/posts/')">📝 Review</xsl:when>
        <xsl:when test="contains(sm:loc,'/news/')">📰 News</xsl:when>
        <xsl:otherwise>🏠 Home</xsl:otherwise>
      </xsl:choose>
    </td>
    <td style="color:#9ca3af">
      <xsl:value-of select="sm:lastmod"/>
      <xsl:if test="not(sm:lastmod)">—</xsl:if>
    </td>
    <td>
      <xsl:choose>
        <xsl:when test="sm:priority &gt;= 1.0"><span class="priority p-high"><xsl:value-of select="sm:priority"/></span></xsl:when>
        <xsl:otherwise><span class="priority p-mid"><xsl:value-of select="sm:priority"/></span></xsl:otherwise>
      </xsl:choose>
    </td>
  </tr>
</xsl:for-each>
</tbody>
</table>
<div class="footer">
  <p><a href="/">← Back to AI Best Find</a></p>
  <p style="margin-top:8px">This sitemap is automatically updated. Last generated: <xsl:value-of select="sm:urlset/sm:url[1]/sm:lastmod"/>.</p>
</div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>
