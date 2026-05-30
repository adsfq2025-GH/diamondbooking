import fs from "node:fs";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const srcRoot = path.join(projectRoot, "src");
const appRoot = path.join(srcRoot, "app");

const CODE_EXT = new Set([".ts", ".tsx"]);

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".")) continue;
      files.push(...walk(full));
      continue;
    }
    if (CODE_EXT.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function routePathFromAppFile(filePath) {
  const rel = path.relative(appRoot, filePath).split(path.sep).join("/");
  if (rel === "page.tsx") return "/";
  if (!rel.endsWith("/page.tsx") && !rel.endsWith("/route.ts")) return null;
  if (rel === "route.ts") return "/api";
  const without = rel.replace(/\/(page\.tsx|route\.ts)$/, "");
  const cleaned = without
    .split("/")
    .filter((seg) => !(seg.startsWith("(") && seg.endsWith(")")))
    .join("/");
  const asPath = "/" + cleaned;
  return asPath.replace(/\/index$/g, "/");
}

function getRoutePatterns() {
  const files = walk(appRoot);
  const patterns = new Set();
  for (const file of files) {
    const route = routePathFromAppFile(file);
    if (!route) continue;
    patterns.add(route);
  }
  return [...patterns];
}

function isExternal(href) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    href.startsWith("sms:") ||
    href.startsWith("javascript:")
  );
}

function isIgnorable(href) {
  if (!href) return true;
  if (href.startsWith("#")) return true;
  if (isExternal(href)) return true;
  if (href.includes("${")) return true;
  if (href.includes("`")) return true;
  return false;
}

function extractInternalLinks(content) {
  const found = [];
  const patterns = [
    /href\s*=\s*["']([^"']+)["']/g,
    /href\s*=\s*\{\s*["']([^"']+)["']\s*\}/g,
    /redirect\s*\(\s*["']([^"']+)["']\s*\)/g,
    /router\.push\s*\(\s*["']([^"']+)["']\s*\)/g,
    /router\.replace\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(content))) {
      found.push(m[1]);
    }
  }
  return found
    .map((x) => x.trim())
    .filter((x) => x.startsWith("/"))
    .filter((x) => !isIgnorable(x));
}

function matchRoute(pathname, pattern) {
  if (pattern === pathname) return true;
  const p = pathname.split("?")[0].split("#")[0];
  const a = p.split("/").filter(Boolean);
  const b = pattern.split("/").filter(Boolean);

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const bs = b[j];
    if (bs.startsWith("[...") && bs.endsWith("]")) return true;
    if (bs.startsWith("[") && bs.endsWith("]")) {
      i += 1;
      j += 1;
      continue;
    }
    if (a[i] !== bs) return false;
    i += 1;
    j += 1;
  }
  return i === a.length && j === b.length;
}

function findMatches(pathname, routePatterns) {
  const matches = [];
  for (const pattern of routePatterns) {
    if (matchRoute(pathname, pattern)) matches.push(pattern);
  }
  return matches;
}

function main() {
  const routePatterns = getRoutePatterns();
  const files = walk(srcRoot);

  const links = new Map();
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const hrefs = extractInternalLinks(content);
    for (const href of hrefs) {
      const key = href.split("?")[0].split("#")[0];
      const list = links.get(key) ?? [];
      list.push(path.relative(projectRoot, file).split(path.sep).join("/"));
      links.set(key, list);
    }
  }

  const broken = [];
  for (const [href, sources] of links.entries()) {
    const matches = findMatches(href, routePatterns);
    if (!matches.length) {
      broken.push({ href, sources });
    }
  }

  broken.sort((a, b) => a.href.localeCompare(b.href));

  const report = {
    totalRoutePatterns: routePatterns.length,
    totalUniqueInternalLinks: links.size,
    brokenCount: broken.length,
    broken,
  };

  console.log(JSON.stringify(report, null, 2));
  if (broken.length) process.exitCode = 1;
}

main();
