/**
 * Static blog generator.
 *
 * Reads Markdown articles from `content/blog/*.md` and returns ready-to-serve
 * files: HTML pages without client-side JavaScript, a Markdown twin of every
 * article, RSS, sitemap.xml, robots.txt and llms.txt. The Vite plugin in
 * `plugin.ts` serves these files in development and emits them on build.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Marked, type Token, type Tokens, type TokensList } from "marked";

export interface BlogConfig {
  /** Directory with the Markdown articles. */
  contentDir: string;
  /** Stylesheet shared by all blog pages. */
  cssFile: string;
  /** Vite public directory, used to look up Open Graph images. */
  publicDir: string;
  /** Absolute origin without trailing slash, e.g. https://example.com */
  siteUrl: string;
}

export interface PostSummary {
  slug: string;
  url: string;
  title: string;
  description: string;
  date: string;
  dateLabel: string;
  category: string;
  author: string;
  readingMinutes: number;
}

interface Post extends PostSummary {
  metaTitle: string;
  updated: string;
  updatedLabel: string;
  keywords: string[];
  takeaways: string[];
  sources: Array<{ label: string; url: string }>;
  body: string;
  html: string;
  toc: Array<{ id: string; text: string }>;
  faq: Array<{ question: string; answer: string }>;
  wordCount: number;
  ogImage: string | null;
}

export interface BlogOutput {
  /** File path relative to the site root -> file content. */
  files: Map<string, string>;
  posts: PostSummary[];
}

export const SITE_NAME = "Trainingsprofil";
export const SITE_TAGLINE = "Dein Plan beginnt mit dir";
export const SITE_DESCRIPTION =
  "Trainingsprofil erstellt aus deinem Ziel, deinem Trainingsstand, deinem Alltag, deiner Ausstattung und deinen Einschränkungen einen persönlichen Trainingsplan.";
const BLOG_TITLE = "Trainingsprofil Blog: Trainingsplanung verständlich erklärt";
const BLOG_DESCRIPTION =
  "Verständliche Artikel zu Trainingsplanung, Kraft, Ausdauer und Erholung. Damit dein Trainingsplan zu deinem Ziel und deinem Alltag passt.";
const CHECK_URL = "/#profil";
const FAQ_HEADING = /^(häufige fragen|faq)/i;

const ICONS: Record<string, string> = {
  "arrow-right": '<path d="M5 12h14M13 6l6 6-6 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  dumbbell: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
  heart: '<path d="M20.8 5.8a5 5 0 0 0-7.1 0L12 7.5l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.1a5 5 0 0 0 0-7.1Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
  shield: '<path d="M12 3 5 6v5c0 4.8 2.8 8.3 7 10 4.2-1.7 7-5.2 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  spark:
    '<path d="m12 3 1.3 4.1L17 9l-3.7 1.9L12 15l-1.3-4.1L7 9l3.7-1.9L12 3Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
};

export function icon(name: string, size = 20): string {
  const body = ICONS[name] ?? ICONS.spark;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`Ungültiges Datum im Blogartikel: ${iso}`);
  return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function jsonLd(data: unknown): string {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

/* ---------- Frontmatter ---------- */

type Frontmatter = Record<string, string | string[]>;

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'")))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Minimal frontmatter reader: `key: value` pairs and `- item` lists. */
function parseFrontmatter(raw: string, file: string): { data: Frontmatter; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw);
  if (!match) throw new Error(`${file}: Frontmatter (--- … ---) fehlt.`);
  const data: Frontmatter = {};
  let listKey: string | null = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) {
      (data[listKey] as string[]).push(unquote(item[1]));
      continue;
    }
    const pair = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) throw new Error(`${file}: Frontmatter-Zeile nicht lesbar: ${line}`);
    if (pair[2] === "") {
      data[pair[1]] = [];
      listKey = pair[1];
    } else {
      data[pair[1]] = unquote(pair[2]);
      listKey = null;
    }
  }
  return { data, body: raw.slice(match[0].length).trim() };
}

function text(data: Frontmatter, key: string, file: string, fallback?: string): string {
  const value = data[key];
  if (typeof value === "string" && value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`${file}: Pflichtfeld "${key}" fehlt im Frontmatter.`);
}

function list(data: Frontmatter, key: string): string[] {
  const value = data[key];
  return Array.isArray(value) ? value : [];
}

/* ---------- Markdown ---------- */

function plainText(tokens: Token[] | undefined): string {
  if (!tokens) return "";
  return tokens
    .map((token) => {
      if (token.type === "space") return " ";
      if (token.type === "list") return (token as Tokens.List).items.map((item) => plainText(item.tokens)).join(" ");
      if (token.type === "table") {
        const table = token as Tokens.Table;
        return [...table.header, ...table.rows.flat()].map((cell) => plainText(cell.tokens)).join(" ");
      }
      if ("tokens" in token && token.tokens) return plainText(token.tokens);
      return "text" in token && typeof token.text === "string" ? token.text : "";
    })
    .join(separatorFor(tokens))
    .replace(/\s+/g, " ")
    .trim();
}

/** Block level tokens are joined with a space, inline tokens without. */
function separatorFor(tokens: Token[]): string {
  return tokens.some((token) => ["paragraph", "heading", "list", "blockquote", "table"].includes(token.type)) ? " " : "";
}

function headingId(textValue: string, used: Set<string>): string {
  const base = slugify(textValue.replace(/^\d+\.\s+/, "")) || "abschnitt";
  let id = base;
  let counter = 2;
  while (used.has(id)) id = `${base}-${counter++}`;
  used.add(id);
  return id;
}

function renderMarkdown(body: string): Pick<Post, "html" | "toc" | "faq" | "wordCount"> {
  const usedIds = new Set<string>();
  const toc: Post["toc"] = [];
  const md = new Marked({ gfm: true });

  md.use({
    renderer: {
      heading(token: Tokens.Heading): string {
        const label = decodeEntities(plainText(token.tokens));
        const id = headingId(label, usedIds);
        let inner = this.parser.parseInline(token.tokens);
        if (token.depth === 2) toc.push({ id, text: label });
        if (token.depth === 3) {
          inner = inner.replace(/^(\d+)\.\s+/, '<span class="h-num">$1<span class="vh">.</span></span> ');
        }
        return `<h${token.depth} id="${id}">${inner}</h${token.depth}>\n`;
      },
      link(token: Tokens.Link): string {
        const inner = this.parser.parseInline(token.tokens);
        const external = /^https?:\/\//.test(token.href);
        const attrs = external ? ' target="_blank" rel="noopener"' : "";
        return `<a href="${escapeHtml(token.href)}"${attrs}>${inner}</a>`;
      },
    },
  });

  const tokens = md.lexer(body);
  const parse = (slice: Token[]): string => md.parser(Object.assign(slice, { links: tokens.links }) as TokensList);
  const faq: Post["faq"] = [];
  const parts: string[] = [];
  let buffer: Token[] = [];
  const flush = () => {
    if (buffer.length) parts.push(parse(buffer));
    buffer = [];
  };

  let index = 0;
  while (index < tokens.length) {
    const token = tokens[index];
    const isFaqHeading = token.type === "heading" && token.depth === 2 && FAQ_HEADING.test(token.text);
    if (!isFaqHeading) {
      buffer.push(token);
      index += 1;
      continue;
    }

    // FAQ section: every h3 is a question, the blocks below it are the answer.
    buffer.push(token);
    index += 1;
    while (index < tokens.length && tokens[index].type !== "heading") buffer.push(tokens[index++]);
    flush();
    const items: string[] = [];
    while (index < tokens.length) {
      const question = tokens[index];
      if (question.type !== "heading" || question.depth !== 3) break;
      index += 1;
      const answer: Token[] = [];
      while (index < tokens.length && tokens[index].type !== "heading") answer.push(tokens[index++]);
      faq.push({
        question: decodeEntities(plainText((question as Tokens.Heading).tokens)),
        answer: decodeEntities(plainText(answer)),
      });
      items.push(`<div class="faq__item">${parse([question])}${parse(answer)}</div>`);
    }
    parts.push(`<div class="faq">${items.join("\n")}</div>`);
  }
  flush();

  const html = parts
    .join("\n")
    .replace(/<table>/g, '<div class="table-wrap"><table>')
    .replace(/<\/table>/g, "</table></div>")
    .replace(/<blockquote>/g, `<aside class="callout"><span class="callout__icon">${icon("info", 20)}</span><div>`)
    .replace(/<\/blockquote>/g, "</div></aside>")
    .replace(
      /<p><strong><a href="([^"]+)">([\s\S]*?)<\/a><\/strong><\/p>/g,
      (_match, href: string, label: string) => `<p class="cta-row"><a class="button button--primary button--large" href="${href}">${label} ${icon("arrow-right", 19)}</a></p>`,
    );

  const wordCount = decodeEntities(plainText(tokens)).split(/\s+/).filter(Boolean).length;
  return { html, toc, faq, wordCount };
}

/* ---------- Posts ---------- */

function loadPosts(config: BlogConfig): Post[] {
  if (!fs.existsSync(config.contentDir)) return [];
  const posts: Post[] = [];
  for (const fileName of fs.readdirSync(config.contentDir).sort()) {
    if (!fileName.endsWith(".md")) continue;
    const file = path.join(config.contentDir, fileName);
    const { data, body } = parseFrontmatter(fs.readFileSync(file, "utf8"), fileName);
    if (data.draft === "true") continue;

    const slug = text(data, "slug", fileName, fileName.replace(/\.md$/, ""));
    if (slug !== slugify(slug)) throw new Error(`${fileName}: Slug "${slug}" darf nur a-z, 0-9 und Bindestriche enthalten.`);
    const title = text(data, "title", fileName);
    const date = text(data, "date", fileName);
    const updated = text(data, "updated", fileName, date);
    const rendered = renderMarkdown(body);
    const ogCandidates = [`blog/og/${slug}.jpg`, "blog/og/default.jpg"];
    const ogImage = ogCandidates.find((candidate) => fs.existsSync(path.join(config.publicDir, candidate))) ?? null;

    posts.push({
      slug,
      url: `/blog/${slug}/`,
      title,
      metaTitle: text(data, "metaTitle", fileName, title),
      description: text(data, "description", fileName),
      date,
      dateLabel: formatDate(date),
      updated,
      updatedLabel: formatDate(updated),
      author: text(data, "author", fileName, SITE_NAME),
      category: text(data, "category", fileName, "Training"),
      keywords: list(data, "keywords"),
      takeaways: list(data, "takeaways"),
      sources: list(data, "sources").map((entry) => {
        const [label = "", url = ""] = entry.split("|").map((part) => part.trim());
        return { label, url };
      }),
      body,
      readingMinutes: Math.max(1, Math.round(rendered.wordCount / 200)),
      ogImage: ogImage ? `/${ogImage}` : null,
      ...rendered,
    });
  }
  return posts.sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date)));
}

/* ---------- Templates ---------- */

interface PageHead {
  title: string;
  description: string;
  canonical: string;
  ogTitle: string;
  ogType: "website" | "article";
  ogImage: string | null;
  cssHref: string;
  siteUrl: string;
  extra?: string;
  structuredData: unknown;
}

function head(page: PageHead): string {
  const image = page.ogImage ? `${page.siteUrl}${page.ogImage}` : null;
  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${page.canonical}">
<meta name="theme-color" content="#123c3b">
<link rel="icon" type="image/png" href="/logo_new2.png">
<link rel="alternate" type="application/rss+xml" title="${escapeHtml(SITE_NAME)} Blog" href="${page.siteUrl}/blog/feed.xml">
<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">
<meta property="og:locale" content="de_DE">
<meta property="og:type" content="${page.ogType}">
<meta property="og:title" content="${escapeHtml(page.ogTitle)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:url" content="${page.canonical}">
${image ? `<meta property="og:image" content="${image}">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n<meta name="twitter:image" content="${image}">` : ""}
<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${escapeHtml(page.ogTitle)}">
<meta name="twitter:description" content="${escapeHtml(page.description)}">
${page.extra ?? ""}
<link rel="stylesheet" href="${page.cssHref}">
${jsonLd(page.structuredData)}`;
}

function siteNav(active: "blog" | "post"): string {
  return `<a class="skip-link" href="#inhalt">Zum Inhalt springen</a>
<header class="site-nav">
  <div class="shell site-nav__inner">
    <a class="brand" href="/" aria-label="${SITE_NAME} Startseite"><span class="brand__strong">Trainings</span><span class="brand__light">profil</span></a>
    <nav aria-label="Hauptnavigation">
      <a href="/">Startseite</a>
      <a href="/blog/"${active === "blog" ? ' aria-current="page"' : ""}>Blog</a>
    </nav>
    <a class="button button--dark button--small" href="${CHECK_URL}">Trainings-Check starten ${icon("arrow-right", 17)}</a>
  </div>
</header>`;
}

function siteFooter(): string {
  return `<footer class="site-footer">
  <div class="shell site-footer__inner">
    <a class="brand" href="/" aria-label="${SITE_NAME} Startseite"><span class="brand__strong">Trainings</span><span class="brand__light">profil</span></a>
    <p>Die Inhalte dieses Blogs sind allgemeine Trainingshinweise und ersetzen keine medizinische Diagnose, Behandlung oder persönliche Betreuung.</p>
    <nav aria-label="Fusszeile">
      <a href="/">Startseite</a>
      <a href="/blog/">Blog</a>
      <a href="${CHECK_URL}">Trainings-Check</a>
      <a href="/blog/feed.xml">RSS</a>
    </nav>
  </div>
</footer>`;
}

function ctaBand(): string {
  return `<section class="cta-band shell" aria-labelledby="cta-band-title">
  <div class="cta-band__copy">
    <span class="eyebrow eyebrow--light">${icon("spark", 16)} Dein persönlicher Trainings-Check</span>
    <h2 id="cta-band-title">Dein Plan beginnt mit dir.</h2>
    <p>Sieben kurze Schritte, etwa 6 bis 8 Minuten. Daraus entsteht die Grundlage für einen Trainingsplan, der zu deinem Ziel und deinem Alltag passt.</p>
    <a class="button button--accent button--large" href="${CHECK_URL}">Trainings-Check starten ${icon("arrow-right", 19)}</a>
  </div>
  <div class="cta-band__orbit" aria-hidden="true"><span></span><span></span><span></span></div>
</section>`;
}

function postCard(post: Post, featured: boolean): string {
  const heading = featured ? "h2" : "h3";
  return `<article class="post-card${featured ? " post-card--featured" : ""}">
  <div class="post-card__copy">
    <span class="eyebrow">${escapeHtml(post.category)}</span>
    <${heading}><a href="${post.url}">${escapeHtml(post.title)}</a></${heading}>
    <p>${escapeHtml(post.description)}</p>
    <div class="post-card__meta">
      <time datetime="${post.date}">${post.dateLabel}</time>
      <span>${icon("clock", 15)} ${post.readingMinutes} Min. Lesezeit</span>
    </div>
    <a class="text-link" href="${post.url}" aria-label="${escapeHtml(`Artikel lesen: ${post.title}`)}">Artikel lesen ${icon("arrow-right", 16)}</a>
  </div>
</article>`;
}

function organization(siteUrl: string) {
  return { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: SITE_NAME, url: `${siteUrl}/` };
}

function renderIndex(posts: Post[], config: BlogConfig, cssHref: string): string {
  const canonical = `${config.siteUrl}/blog/`;
  const [featured, ...rest] = posts;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      organization(config.siteUrl),
      {
        "@type": "Blog",
        "@id": `${canonical}#blog`,
        url: canonical,
        name: `${SITE_NAME} Blog`,
        description: BLOG_DESCRIPTION,
        inLanguage: "de",
        publisher: { "@id": `${config.siteUrl}/#organization` },
        blogPost: posts.map((post) => ({
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          url: `${config.siteUrl}${post.url}`,
          datePublished: post.date,
          dateModified: post.updated,
          author: { "@type": "Person", name: post.author },
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Startseite", item: `${config.siteUrl}/` },
          { "@type": "ListItem", position: 2, name: "Blog", item: canonical },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="de">
<head>
${head({
  title: BLOG_TITLE,
  description: BLOG_DESCRIPTION,
  canonical,
  ogTitle: BLOG_TITLE,
  ogType: "website",
  ogImage: fs.existsSync(path.join(config.publicDir, "blog/og/default.jpg")) ? "/blog/og/default.jpg" : null,
  cssHref,
  siteUrl: config.siteUrl,
  structuredData,
})}
</head>
<body class="page-index">
${siteNav("blog")}
<main id="inhalt">
  <section class="blog-hero shell">
    <span class="hero-pill"><span></span>${icon("spark", 16)} Trainingsprofil Blog</span>
    <h1>Wissen für Training, das zu dir passt.</h1>
    <p>Verständliche Artikel zu Trainingsplanung, Kraft, Ausdauer und Erholung. Ohne Fachjargon, mit klaren Antworten und Beispielen aus dem Alltag.</p>
  </section>

  <section class="shell post-list" aria-label="Artikel">
    ${featured ? postCard(featured, true) : '<p class="post-list__empty">Die ersten Artikel erscheinen in Kürze.</p>'}
    ${rest.length ? `<h2 class="post-list__heading">Weitere Artikel</h2>\n<div class="post-grid">${rest.map((post) => postCard(post, false)).join("\n")}</div>` : ""}
  </section>

  ${ctaBand()}
</main>
${siteFooter()}
</body>
</html>
`;
}

function renderPost(post: Post, posts: Post[], config: BlogConfig, cssHref: string): string {
  const canonical = `${config.siteUrl}${post.url}`;
  const image = post.ogImage ? `${config.siteUrl}${post.ogImage}` : undefined;
  const initials = post.author
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const others = posts.filter((item) => item.slug !== post.slug).slice(0, 3);
  const hasOwnCta = post.html.includes('class="cta-row"');

  const graph: unknown[] = [
    organization(config.siteUrl),
    {
      "@type": "BlogPosting",
      "@id": `${canonical}#article`,
      mainEntityOfPage: canonical,
      url: canonical,
      headline: post.title,
      description: post.description,
      inLanguage: "de",
      datePublished: post.date,
      dateModified: post.updated,
      author: { "@type": "Person", name: post.author },
      publisher: { "@id": `${config.siteUrl}/#organization` },
      articleSection: post.category,
      keywords: post.keywords.join(", "),
      wordCount: post.wordCount,
      timeRequired: `PT${post.readingMinutes}M`,
      ...(image ? { image: [image] } : {}),
      ...(post.sources.length ? { citation: post.sources.map((source) => source.url) } : {}),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Startseite", item: `${config.siteUrl}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${config.siteUrl}/blog/` },
        { "@type": "ListItem", position: 3, name: post.title, item: canonical },
      ],
    },
  ];
  if (post.faq.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${canonical}#faq`,
      mainEntity: post.faq.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  const extra = `<meta name="author" content="${escapeHtml(post.author)}">
<meta name="keywords" content="${escapeHtml(post.keywords.join(", "))}">
<meta property="article:published_time" content="${post.date}">
<meta property="article:modified_time" content="${post.updated}">
<meta property="article:section" content="${escapeHtml(post.category)}">
<link rel="alternate" type="text/markdown" title="Markdown-Version" href="${config.siteUrl}/blog/${post.slug}.md">`;

  return `<!doctype html>
<html lang="de">
<head>
${head({
  title: post.metaTitle,
  description: post.description,
  canonical,
  ogTitle: post.title,
  ogType: "article",
  ogImage: post.ogImage,
  cssHref,
  siteUrl: config.siteUrl,
  extra,
  structuredData: { "@context": "https://schema.org", "@graph": graph },
})}
</head>
<body class="page-post">
${siteNav("post")}
<main id="inhalt">
  <article class="post">
    <header class="post-hero shell">
      <nav class="breadcrumb" aria-label="Brotkrumen">
        <a href="/">Startseite</a><span aria-hidden="true">/</span><a href="/blog/">Blog</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(post.category)}</span>
      </nav>
      <h1>${escapeHtml(post.title)}</h1>
      <p class="post-hero__lead">${escapeHtml(post.description)}</p>
      <div class="post-meta">
        <span class="post-meta__avatar" aria-hidden="true">${escapeHtml(initials)}</span>
        <div>
          <strong>Von ${escapeHtml(post.author)}</strong>
          <span><time datetime="${post.date}">${post.dateLabel}</time>${post.updated !== post.date ? ` · aktualisiert am <time datetime="${post.updated}">${post.updatedLabel}</time>` : ""} · ${post.readingMinutes} Min. Lesezeit</span>
        </div>
      </div>
    </header>

    <div class="shell post-layout">
      <aside class="post-aside">
        <nav class="toc" aria-labelledby="toc-title">
          <strong id="toc-title">Inhalt</strong>
          <ol>
            ${post.toc.map((entry) => `<li><a href="#${entry.id}">${escapeHtml(entry.text)}</a></li>`).join("\n            ")}
          </ol>
        </nav>
        <div class="aside-cta">
          <strong>Dein Plan beginnt mit dir.</strong>
          <p>Sieben kurze Schritte, etwa 6 bis 8 Minuten.</p>
          <a class="button button--primary button--small" href="${CHECK_URL}">Trainings-Check starten</a>
        </div>
      </aside>

      <div class="post-body">
        ${
          post.takeaways.length
            ? `<section class="takeaways" aria-labelledby="takeaways-title">
          <h2 id="takeaways-title">${icon("spark", 20)} Das Wichtigste in Kürze</h2>
          <ul>
            ${post.takeaways.map((item) => `<li>${icon("check", 17)}<span>${escapeHtml(item)}</span></li>`).join("\n            ")}
          </ul>
        </section>`
            : ""
        }

        <div class="prose">
${post.html}
        </div>

        ${
          post.sources.length
            ? `<section class="sources" aria-labelledby="sources-title">
          <h2 id="sources-title">Quellen</h2>
          <ul>
            ${post.sources.map((source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener">${escapeHtml(source.label)}</a></li>`).join("\n            ")}
          </ul>
        </section>`
            : ""
        }

        <footer class="post-footer">
          <div class="post-meta">
            <span class="post-meta__avatar" aria-hidden="true">${escapeHtml(initials)}</span>
            <div>
              <strong>${escapeHtml(post.author)}</strong>
              <span>Veröffentlicht am <time datetime="${post.date}">${post.dateLabel}</time> · ${SITE_NAME}</span>
            </div>
          </div>
          <a class="text-link" href="/blog/${post.slug}.md">Artikel als Markdown</a>
        </footer>
      </div>
    </div>
  </article>

  ${
    others.length
      ? `<section class="shell post-list" aria-labelledby="more-title">
    <h2 class="post-list__heading" id="more-title">Weitere Artikel</h2>
    <div class="post-grid">${others.map((item) => postCard(item, false)).join("\n")}</div>
  </section>`
      : ""
  }

  ${hasOwnCta ? "" : ctaBand()}
</main>
${siteFooter()}
</body>
</html>
`;
}

/* ---------- Machine readable outputs ---------- */

function absoluteLinks(markdown: string, siteUrl: string): string {
  return markdown.replace(/\]\(\/(?!\/)/g, `](${siteUrl}/`);
}

function renderPostMarkdown(post: Post, config: BlogConfig): string {
  const lines = [
    `# ${post.title}`,
    "",
    `> ${post.description}`,
    "",
    `- Autor: ${post.author}`,
    `- Veröffentlicht: ${post.date}`,
    `- Aktualisiert: ${post.updated}`,
    `- Kanonische URL: ${config.siteUrl}${post.url}`,
    `- Herausgeber: ${SITE_NAME} (${config.siteUrl}/)`,
    "",
  ];
  if (post.takeaways.length) {
    lines.push("## Das Wichtigste in Kürze", "", ...post.takeaways.map((item) => `- ${item}`), "");
  }
  lines.push(absoluteLinks(post.body, config.siteUrl), "");
  if (post.sources.length) {
    lines.push("## Quellen", "", ...post.sources.map((source) => `- [${source.label}](${source.url})`), "");
  }
  return lines.join("\n");
}

function renderFeed(posts: Post[], config: BlogConfig): string {
  const items = posts
    .map(
      (post) => `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${config.siteUrl}${post.url}</link>
      <guid isPermaLink="true">${config.siteUrl}${post.url}</guid>
      <pubDate>${new Date(`${post.date}T08:00:00Z`).toUTCString()}</pubDate>
      <dc:creator>${escapeHtml(post.author)}</dc:creator>
      <category>${escapeHtml(post.category)}</category>
      <description>${escapeHtml(post.description)}</description>
    </item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeHtml(SITE_NAME)} Blog</title>
    <link>${config.siteUrl}/blog/</link>
    <description>${escapeHtml(BLOG_DESCRIPTION)}</description>
    <language>de</language>
    <atom:link href="${config.siteUrl}/blog/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

function renderSitemap(posts: Post[], config: BlogConfig): string {
  const latest = posts.reduce((max, post) => (post.updated > max ? post.updated : max), "");
  const urls = [
    { loc: `${config.siteUrl}/`, lastmod: "" },
    { loc: `${config.siteUrl}/blog/`, lastmod: latest },
    ...posts.map((post) => ({ loc: `${config.siteUrl}${post.url}`, lastmod: post.updated })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url.loc}</loc>${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;
}

function renderRobots(config: BlogConfig): string {
  const aiCrawlers = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended"];
  return `# Suchmaschinen und KI-Assistenten dürfen alle öffentlichen Seiten lesen.
User-agent: *
Allow: /

${aiCrawlers.map((agent) => `User-agent: ${agent}\nAllow: /`).join("\n\n")}

Sitemap: ${config.siteUrl}/sitemap.xml
`;
}

function renderLlmsTxt(posts: Post[], config: BlogConfig): string {
  return `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} ist eine deutschsprachige Web-App. Im Trainings-Check beantwortest du sieben kurze Schritte (etwa 6 bis 8 Minuten) zu Ziel, Trainingsstand, Zeitfenstern, Ausstattung, Beschwerden und Vorlieben. Daraus entsteht ein Trainingsplan über 4, 8, 12 oder 16 Wochen, der online im Konto und als PDF verfügbar ist. Trainingspläne ersetzen keine medizinische Diagnose, Behandlung oder persönliche Betreuung.

## Blog

${posts.map((post) => `- [${post.title}](${config.siteUrl}/blog/${post.slug}.md): ${post.description}`).join("\n")}

## Produkt

- [Startseite](${config.siteUrl}/): Überblick, für wen ${SITE_NAME} gedacht ist und wie der Trainings-Check funktioniert
- [Trainings-Check starten](${config.siteUrl}${CHECK_URL}): Trainingsprofil in sieben Schritten erstellen

## Optional

- [Blog-Übersicht](${config.siteUrl}/blog/): alle Artikel als HTML
- [RSS-Feed](${config.siteUrl}/blog/feed.xml)
- [Sitemap](${config.siteUrl}/sitemap.xml)
`;
}

/* ---------- Entry point ---------- */

export function buildBlog(config: BlogConfig): BlogOutput {
  const posts = loadPosts(config);
  const css = fs.readFileSync(config.cssFile, "utf8");
  const cssHref = `/blog/blog.css?v=${createHash("md5").update(css).digest("hex").slice(0, 8)}`;

  const files = new Map<string, string>();
  files.set("blog/blog.css", css);
  files.set("blog/index.html", renderIndex(posts, config, cssHref));
  files.set("blog/feed.xml", renderFeed(posts, config));
  for (const post of posts) {
    files.set(`blog/${post.slug}/index.html`, renderPost(post, posts, config, cssHref));
    files.set(`blog/${post.slug}.md`, renderPostMarkdown(post, config));
  }
  files.set("sitemap.xml", renderSitemap(posts, config));
  files.set("robots.txt", renderRobots(config));
  files.set("llms.txt", renderLlmsTxt(posts, config));

  return {
    files,
    posts: posts.map(({ slug, url, title, description, date, dateLabel, category, author, readingMinutes }) => ({
      slug,
      url,
      title,
      description,
      date,
      dateLabel,
      category,
      author,
      readingMinutes,
    })),
  };
}
