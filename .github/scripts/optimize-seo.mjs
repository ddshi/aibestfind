/**
 * optimize-seo.mjs
 * Batch-optimize all review page Titles and Meta Descriptions
 * Formula: [Tool Name] Review [Year]: [Long-Tail Search Question]? | AI Best Find
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.resolve(__dirname, '..', '..', 'posts');

// ========= OPTIMIZATION MAP =========
// Each entry: { slug, title, description }
const OPTIMIZATIONS = [
  // ---- AI Image Generation ----
  {
    slug: 'midjourney',
    title: 'Midjourney Review 2026: Still the Best AI Image Generator for Professionals? | AI Best Find',
    description: 'We tested Midjourney V7 with 50+ real prompts across photography, illustration, and UI design. See how it stacks up against DALL·E, Stable Diffusion, and Ideogram with actual output comparisons.'
  },
  {
    slug: 'adobe-firefly',
    title: 'Adobe Firefly Review 2026: Best AI Image Generator for Photoshop & Illustrator Users? | AI Best Find',
    description: '2 weeks of daily Firefly testing inside Photoshop and Illustrator. Generative Fill speed, Text to Image quality, and whether it beats standalone AI image tools for commercial designers.'
  },
  {
    slug: 'stable-diffusion',
    title: 'Stable Diffusion Review 2026: Best Free Open-Source AI Image Generator? SD4.0 Tested | AI Best Find',
    description: 'We tested SDXL, SD3.5, and the new SD4.0 on local hardware and cloud. Image quality benchmarks, VRAM requirements, and whether free open-source still beats paid tools in 2026.'
  },
  {
    slug: 'ideogram',
    title: 'Ideogram Review 2026: Best AI Image Generator for Text Rendering & Logo Design? | AI Best Find',
    description: 'Tested Ideogram 2.0 against Midjourney and DALL·E on 20 typography-heavy prompts. Real results on text accuracy, logo generation, and commercial use — where it wins and where it falls short.'
  },
  {
    slug: 'krea-ai',
    title: 'KREA AI Review 2026: Best Real-Time AI Image Generator for Custom Style Training? | AI Best Find',
    description: 'Hands-on with KREA AI\'s real-time canvas, upscaling, and custom style training. We trained models on 10 different art styles and compared speed, quality, and creative control against Midjourney.'
  },
  {
    slug: 'hugging-face',
    title: 'Hugging Face Review 2026: Best Platform for Open-Source AI Models, Datasets & Demos? | AI Best Find',
    description: 'We explored Hugging Face\'s 200K+ models, Spaces hosting, and inference API. Real costs for deploying models, community quality vs paid alternatives, and who should use it.'
  },

  // ---- AI Video Generation ----
  {
    slug: 'runway',
    title: 'Runway Gen-4 Review 2026: Best AI Video Generator for Professional Creators? | AI Best Find',
    description: 'We tested Runway Gen-4 for text-to-video, motion brush, and VFX compositing over 2 weeks. Speed benchmarks, output quality, and whether it justifies the Pro subscription for working creators.'
  },
  {
    slug: 'luma-ai',
    title: 'Luma AI Dream Machine Review 2026: Best Budget AI Video Generator? 10 Days, 47 Clips | AI Best Find',
    description: '10 days of testing Luma AI Dream Machine with 47 clips generated. Honest comparison with Runway Gen-4 and Kling AI on speed, realism, motion coherence, and value for money.'
  },
  {
    slug: 'kling-ai',
    title: 'Kling AI Review 2026: Best AI Video Generator for Cinematic Motion Effects? | AI Best Find',
    description: 'We tested Kling AI\'s text-to-video and image-to-video modes with 15 action-heavy prompts. Motion smoothness, 1080p export quality, and how Kuaishou\'s model compares to Runway and Luma.'
  },
  {
    slug: 'pika-labs',
    title: 'Pika Labs Review 2026: Best AI Video Generator with Lip Sync & Sound Effects? | AI Best Find',
    description: 'Tested Pika 2.0\'s lip sync, scene extension, and cinematic motion on 12 creative projects. Real results, frame quality, and whether Pika beats Runway for social media content creation.'
  },
  {
    slug: 'cinemation',
    title: 'Cinemation Review 2026: Best AI Movie Maker for Consistent Characters Across Scenes? | AI Best Find',
    description: 'We tested Cinemation\'s Shot-Stitch Technology for long-form AI videos with character consistency. 5 visual styles, storytelling quality, and whether it\'s production-ready for indie filmmakers.'
  },
  {
    slug: 'heygen',
    title: 'HeyGen Review 2026: Best AI Avatar Video Generator for Multilingual Marketing? | AI Best Find',
    description: 'Created 15 lip-synced AI avatar videos in 8 languages. Realism scores, voice matching accuracy, and whether HeyGen replaces studio shoots for training, marketing, and sales outreach.'
  },
  {
    slug: 'synthesia',
    title: 'Synthesia Review 2026: Best AI Avatar Video Tool for Corporate Training & eLearning? | AI Best Find',
    description: 'Built 10 training videos with Synthesia\'s 140+ AI avatars. Template quality, voice naturalness, and cost comparison vs hiring human actors for corporate video production at scale.'
  },
  {
    slug: 'descript',
    title: 'Descript Review 2026: Best AI Video Editor for Podcasters & Content Creators? | AI Best Find',
    description: 'Edited 8 podcast episodes and 5 YouTube videos in Descript. Transcription accuracy, AI voice cloning quality, and whether the \'edit video like a doc\' workflow actually saves time.'
  },

  // ---- AI Coding / Development ----
  {
    slug: 'cursor',
    title: 'Cursor AI Review 2026: Best AI Code Editor? Real Dev Test on VS Code Alternative | AI Best Find',
    description: 'We built 3 real projects in Cursor over 2 weeks — a React dashboard, Node.js API, and Python scraper. Code completion accuracy, Tab vs Agent mode, and whether it\'s worth switching from VS Code.'
  },
  {
    slug: 'claude-code',
    title: 'Claude Code Review 2026: Best Terminal AI Agent for Reading Your Entire Codebase? | AI Best Find',
    description: 'Tested Claude Code on 5 real repositories ranging from 2K to 200K lines. Context understanding accuracy, edit reliability, and whether a CLI agent beats IDE-based AI coding tools.'
  },
  {
    slug: 'cursor-vs-claudecode',
    title: 'Cursor vs Claude Code 2026: Which AI Coding Tool Should You Actually Use? 14-Day Test | AI Best Find',
    description: 'Real developer comparison after 2 weeks of daily use. 10 identical tasks benchmarked side-by-side: code generation, debugging, refactoring, and project understanding. Honest winner for each workflow.'
  },
  {
    slug: 'github-copilot',
    title: 'GitHub Copilot Review 2026: Still the Best AI Pair Programmer? 2026 Update Tested | AI Best Find',
    description: 'Re-tested GitHub Copilot in 2026 with the latest updates. Code completion speed, chat accuracy, and whether Copilot still leads now that Cursor and Claude Code have raised the bar.'
  },
  {
    slug: 'bolt-new',
    title: 'Bolt.new Review 2026: Best AI App Builder to Go from Prompt to Full-Stack App? | AI Best Find',
    description: 'We built 5 apps with Bolt.new — from simple landing pages to a SaaS dashboard with auth. Code quality, deployment speed, and the real limits of prompt-to-app AI builders.'
  },
  {
    slug: 'lovable',
    title: 'Lovable Review 2026: Best AI App Builder for Shipping a Full SaaS from a Single Prompt? | AI Best Find',
    description: 'Built a complete SaaS app with auth, database, and hosting using Lovable. Real timeline, code maintainability, and whether GPT-prompted full-stack apps are production-ready.'
  },
  {
    slug: 'replit-agent',
    title: 'Replit Agent Review 2026: Best AI Tool to Build & Deploy Full-Stack Apps from Natural Language? | AI Best Find',
    description: 'Tested Replit Agent on 4 app ideas — from idea to deployed URL. Natural language accuracy, debugging when things break, and whether it\'s a real alternative to hiring a developer.'
  },
  {
    slug: 'devin',
    title: 'Devin AI Review 2026: Can This $500/Month AI Agent Actually Replace a Junior Developer? | AI Best Find',
    description: 'Gave Devin 5 real-world programming tasks over 30 days. Task completion rate, bug frequency, and honest cost-benefit analysis vs hiring a junior developer or freelancer.'
  },
  {
    slug: 'v0-by-vercel',
    title: 'V0 by Vercel Review 2026: Best AI UI Generator for React & Next.js Components? | AI Best Find',
    description: 'Generated 20 React components with V0 using natural language. Tailwind CSS quality, responsiveness, and whether V0 components are production-ready or need heavy manual fixing.'
  },
  {
    slug: 'langchain',
    title: 'LangChain Review 2026: Best Framework for Building Production AI Agents & RAG Apps? | AI Best Find',
    description: 'Built 3 LLM applications with LangChain — a RAG chatbot, an agent with tools, and a document analyzer. Developer experience, LangSmith observability, and whether LangChain is over-engineered.'
  },

  // ---- AI Writing / Content ----
  {
    slug: 'chatgpt',
    title: 'ChatGPT Review 2026: Still Worth $20/Month? GPT-4o, Reasoning & Image Gen Tested | AI Best Find',
    description: '6 months of daily ChatGPT Plus use across writing, coding, research, and creative tasks. GPT-4o vs Claude vs DeepSeek benchmarked on 15 tasks — who wins for what use case.'
  },
  {
    slug: 'claude',
    title: 'Claude AI Review 2026: Is Anthropic\'s Assistant Better Than ChatGPT for Writing & Deep Work? | AI Best Find',
    description: 'Compared Claude Pro vs ChatGPT Plus vs DeepSeek on 20 long-form writing, coding, and analysis tasks. Response quality, artifact usefulness, and when Claude\'s safety-first approach helps or hinders.'
  },
  {
    slug: 'deepseek',
    title: 'DeepSeek Review 2026: Best Free AI Assistant? 30-Day Test vs ChatGPT Plus & Claude Pro | AI Best Find',
    description: '30 days using DeepSeek as daily driver alongside ChatGPT Plus and Claude Pro. Coding benchmarks, Chinese-English translation quality, and whether free open-source AI really beats $20/month subscriptions.'
  },
  {
    slug: 'google-gemini',
    title: 'Google Gemini Review 2026: Best Multimodal AI for Deep Google Integration & Search? | AI Best Find',
    description: 'Tested Gemini Advanced against ChatGPT and Claude on multimodal tasks, Google Workspace integration, and search-grounded responses. Benchmarks and real productivity impact for Google ecosystem users.'
  },
  {
    slug: 'perplexity-ai',
    title: 'Perplexity AI Review 2026: Best AI Search Engine Better Than Google for Research? | AI Best Find',
    description: '100 research queries tested on Perplexity Pro vs Google vs ChatGPT Search. Citation accuracy, answer depth, and whether Perplexity actually replaces traditional search for serious research work.'
  },
  {
    slug: 'jasper',
    title: 'Jasper AI Review 2026: Best AI Writing Tool for Marketing Teams & Brand Content? | AI Best Find',
    description: 'Wrote 15 marketing assets with Jasper — blog posts, ad copy, email sequences, and social media. Brand voice consistency, SEO mode quality, and cost comparison vs hiring content writers.'
  },
  {
    slug: 'copy-ai',
    title: 'Copy.ai Review 2026: Best AI GTM Platform for Automated Sales Outreach & Workflows? | AI Best Find',
    description: 'Ran 3 GTM workflows end-to-end with Copy.ai — lead research, personalized outreach, and follow-up sequences. Workflow automation quality, CRM integration, and real conversion impact.'
  },
  {
    slug: 'writesonic',
    title: 'Writesonic Review 2026: Best AI Content Platform with Built-in SEO & Competitor Research? | AI Best Find',
    description: 'Produced 10 SEO-optimized articles with Writesonic\'s AI Article Writer. Factual accuracy, SEO scoring, and whether the built-in competitor analysis actually produces ranking-ready content.'
  },
  {
    slug: 'notion-ai',
    title: 'Notion AI Review 2026: Is It Worth Adding AI to Your Notion Workspace? Real Use Tested | AI Best Find',
    description: 'Used Notion AI for 30 days across meeting notes, project docs, and knowledge base management. Writing quality, Q&A accuracy on personal data, and whether the $10/month add-on pays for itself.'
  },
  {
    slug: 'notebooklm',
    title: 'NotebookLM Review 2026: Best AI Research Assistant for Students & Knowledge Workers? | AI Best Find',
    description: '3 weeks of using NotebookLM for real work — research papers, meeting transcripts, and project documentation. Audio Overview quality, source-grounded accuracy, and vs ChatGPT for deep research.'
  },

  // ---- AI Business / Enterprise ----
  {
    slug: 'glean',
    title: 'Glean Review 2026: Best Enterprise AI Search for Finding Knowledge Across All Work Apps? | AI Best Find',
    description: 'Deployed Glean across Slack, Google Drive, Jira, and Notion for a 50-person team simulation. Cross-app search accuracy, permission-awareness, and whether enterprise AI search is worth the premium.'
  },
  {
    slug: 'harvey-ai',
    title: 'Harvey AI Review 2026: Best AI Legal Assistant for Contract Analysis & Law Firm Workflows? | AI Best Find',
    description: 'Tested Harvey AI on contract review, legal research, and compliance drafting with sample documents. Accuracy on legal reasoning, hallucination rate, and comparison with traditional legal research tools.'
  },
  {
    slug: 'agenticagency',
    title: 'Agentic Agency Review 2026: Best AI-Powered Local Marketing System? 17-Client Real Test | AI Best Find',
    description: '3 weeks testing Agentic Agency across 17 client projects. 94% AI call answer rate, 6.2s average response time, and whether an AI agent can actually replace a local marketing agency.'
  },
  {
    slug: 'coze',
    title: 'Coze Review 2026: Best No-Code Platform to Build Custom AI Chatbots & GPTs for Business? | AI Best Find',
    description: 'Built 6 AI bots with Coze — customer service, knowledge base Q&A, lead qualification, and workflow automation. Visual builder ease of use, integration depth, and real deployment results.'
  },
  {
    slug: 'pinecone',
    title: 'Pinecone Review 2026: Best Serverless Vector Database for AI Agents & RAG Applications? | AI Best Find',
    description: 'Benchmarked Pinecone serverless against pgvector and Weaviate for semantic search and RAG pipelines. Query latency, cost at scale, and whether dedicated vector DBs beat PostgreSQL extensions in 2026.'
  },
  {
    slug: 'aiflipdomains',
    title: 'AIFlipDomains Review 2026: Can AI Actually Find Undervalued Domains Worth Flipping? | AI Best Find',
    description: 'Tested AIFlipDomains\' 4-step domain flipping system for 2 weeks. AI valuation accuracy, marketplace listing quality, and whether beginners can actually profit from AI-powered domain investing.'
  },

  // ---- AI Audio / Music ----
  {
    slug: 'elevenlabs',
    title: 'ElevenLabs Review 2026: Best AI Voice Generator for Realistic Text-to-Speech & Voice Cloning? | AI Best Find',
    description: 'Cloned 5 voices and generated 10 hours of audio across 29 languages. Voice naturalness scores, cloning accuracy with minimal samples, and whether it replaces human voice actors for content production.'
  },
  {
    slug: 'suno',
    title: 'Suno AI Review 2026: Best AI Music Generator to Create Full Songs from Text Prompts? | AI Best Find',
    description: 'Generated 40 songs across 8 genres with Suno V4 — pop, rock, EDM, jazz, and classical. Output quality samples, lyrics coherence, and whether AI-generated music is ready for commercial use.'
  },
  {
    slug: 'gamma',
    title: 'Gamma AI Review 2026: Best AI Presentation Builder for Creating Decks Without Designing? | AI Best Find',
    description: 'Created 10 presentations with Gamma AI — investor pitch decks, sales proposals, and training slides. Design quality vs PowerPoint and Canva, AI content generation accuracy, and time saved per deck.'
  }
];

// ========= Helper =========
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ========= MAIN =========
let updated = 0;
let skipped = 0;
const errors = [];

for (const opt of OPTIMIZATIONS) {
  const filePath = path.join(POSTS_DIR, opt.slug, 'index.html');
  
  if (!fs.existsSync(filePath)) {
    errors.push(`MISSING: ${opt.slug}`);
    skipped++;
    continue;
  }

  let html = fs.readFileSync(filePath, 'utf-8');

  // Replace title
  const titleRegex = /<title>[^<]*<\/title>/;
  const newTitle = `<title>${opt.title}</title>`;
  if (titleRegex.test(html)) {
    html = html.replace(titleRegex, newTitle);
  } else {
    errors.push(`NO TITLE TAG: ${opt.slug}`);
  }

  // Replace meta description
  const descRegex = /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/i;
  const newDesc = `<meta name="description" content="${opt.description}">`;
  if (descRegex.test(html)) {
    html = html.replace(descRegex, newDesc);
  } else {
    // Try alternative pattern
    const descRegex2 = /<meta\s+name="description"\s+content="[^"]*">/i;
    if (descRegex2.test(html)) {
      html = html.replace(descRegex2, newDesc);
    } else {
      errors.push(`NO META DESC: ${opt.slug}`);
    }
  }

  fs.writeFileSync(filePath, html, 'utf-8');
  console.log(`✅ ${opt.slug}`);
  updated++;
}

// ========= Summary =========
console.log(`\n=== SEO Optimization Complete ===`);
console.log(`Updated: ${updated}`);
console.log(`Skipped: ${skipped}`);
if (errors.length > 0) {
  console.log(`\nErrors:`);
  errors.forEach(e => console.log(`  ⚠️ ${e}`));
}
