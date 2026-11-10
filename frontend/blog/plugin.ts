import path from "node:path";
import type { HtmlTagDescriptor, Plugin } from "vite";
import { buildBlog, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, type BlogConfig } from "./render.ts";

const DEFAULT_SITE_URL = "https://trainingsprofil-web.onrender.com";
const ROOT_FILES = new Set(["/sitemap.xml", "/robots.txt", "/llms.txt"]);
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

/**
 * Serves the static blog during development and emits it on build.
 *
 * The public origin is baked into canonical URLs, the sitemap and structured
 * data. It is read from `SITE_URL`, then from Render's `RENDER_EXTERNAL_URL`.
 */
export function blogPlugin(): Plugin {
  const siteUrl = (process.env.SITE_URL || process.env.RENDER_EXTERNAL_URL || DEFAULT_SITE_URL).replace(/\/+$/, "");
  let config: BlogConfig;

  return {
    name: "trainingsprofil-blog",

    configResolved(resolved) {
      config = {
        contentDir: path.join(resolved.root, "content/blog"),
        cssFile: path.join(resolved.root, "blog/blog.css"),
        publicDir: resolved.publicDir,
        siteUrl,
      };
    },

    configureServer(server) {
      server.watcher.add([config.contentDir, config.cssFile]);
      const onChange = (file: string) => {
        if (!file.startsWith(config.contentDir) && file !== config.cssFile) return;
        server.hot.send({ type: "full-reload" });
      };
      server.watcher.on("change", onChange);
      server.watcher.on("add", onChange);
      server.watcher.on("unlink", onChange);

      server.middlewares.use((req, res, next) => {
        const pathname = decodeURIComponent((req.url ?? "/").split("?")[0]);
        if (pathname !== "/blog" && !pathname.startsWith("/blog/") && !ROOT_FILES.has(pathname)) return next();

        let files: Map<string, string>;
        try {
          files = buildBlog(config).files;
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(error instanceof Error ? error.message : String(error));
          return;
        }

        let key = pathname.slice(1);
        if (!key.endsWith("/") && files.has(`${key}/index.html`)) {
          res.statusCode = 301;
          res.setHeader("Location", `${pathname}/`);
          res.end();
          return;
        }
        if (key.endsWith("/")) key += "index.html";
        const content = files.get(key);
        if (content === undefined) return next();
        res.setHeader("Content-Type", MIME[path.extname(key)] ?? "text/plain; charset=utf-8");
        res.end(content);
      });
    },

    generateBundle() {
      for (const [fileName, source] of buildBlog(config).files) {
        this.emitFile({ type: "asset", fileName, source });
      }
    },

    /** Search and social metadata for the single-page app itself. */
    transformIndexHtml(): HtmlTagDescriptor[] {
      const title = `${SITE_NAME} – ${SITE_TAGLINE}`;
      const image = `${siteUrl}/blog/og/default.jpg`;
      const meta = (attrs: Record<string, string>): HtmlTagDescriptor => ({ tag: "meta", attrs, injectTo: "head" });
      return [
        { tag: "link", attrs: { rel: "canonical", href: `${siteUrl}/` }, injectTo: "head" },
        { tag: "link", attrs: { rel: "alternate", type: "application/rss+xml", title: `${SITE_NAME} Blog`, href: `${siteUrl}/blog/feed.xml` }, injectTo: "head" },
        meta({ property: "og:site_name", content: SITE_NAME }),
        meta({ property: "og:locale", content: "de_DE" }),
        meta({ property: "og:type", content: "website" }),
        meta({ property: "og:title", content: title }),
        meta({ property: "og:description", content: SITE_DESCRIPTION }),
        meta({ property: "og:url", content: `${siteUrl}/` }),
        meta({ property: "og:image", content: image }),
        meta({ name: "twitter:card", content: "summary_large_image" }),
        meta({ name: "twitter:image", content: image }),
        {
          tag: "script",
          attrs: { type: "application/ld+json" },
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              { "@type": "Organization", "@id": `${siteUrl}/#organization`, name: SITE_NAME, url: `${siteUrl}/` },
              {
                "@type": "WebSite",
                "@id": `${siteUrl}/#website`,
                url: `${siteUrl}/`,
                name: SITE_NAME,
                description: SITE_DESCRIPTION,
                inLanguage: "de",
                publisher: { "@id": `${siteUrl}/#organization` },
              },
            ],
          }).replace(/</g, "\\u003c"),
          injectTo: "head",
        },
      ];
    },
  };
}
