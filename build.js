/**
 * TempoMate Build Script
 *
 * Reads all source files, resolves ES module imports, and inlines everything
 * into a single dist/index.html file that works with file:// protocol.
 *
 * Usage: node build.js
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, join, relative } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SRC_DIR = join(__dirname, 'src');
const DIST_DIR = join(__dirname, 'dist');
const HTML_FILE = join(SRC_DIR, 'index.html');

/**
 * Read a file and return its contents.
 */
function readFile(filePath) {
  return readFileSync(filePath, 'utf-8');
}

/**
 * Resolve all ES module imports in a JS file recursively.
 * Returns the concatenated JS code with imports removed and modules ordered correctly.
 */
function resolveModules(entryPath) {
  const visited = new Set();
  const modules = [];

  function visit(filePath) {
    const absPath = resolve(filePath);
    if (visited.has(absPath)) return;
    visited.add(absPath);

    let content = readFile(absPath);
    const dir = dirname(absPath);

    // Find all import statements and resolve them first (depth-first)
    const importRegex = /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"]([^'"]+)['"]\s*;?/g;
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (importPath.startsWith('.')) {
        const resolvedPath = resolve(dir, importPath);
        visit(resolvedPath);
      }
    }

    // Remove import statements
    content = content.replace(/import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+['"][^'"]+['"]\s*;?\n?/g, '');

    // Remove export statements but keep the declarations (only match at line start)
    content = content.replace(/^export\s+(class|function|const|let|var)\s+/gm, '$1 ');
    content = content.replace(/^export\s+default\s+/gm, '');
    content = content.replace(/^export\s+\{[^}]*\}\s*;?\n?/gm, '');

    // Add module marker comment
    const relPath = relative(SRC_DIR, absPath);
    modules.push(`// --- ${relPath} ---\n${content.trim()}`);
  }

  visit(entryPath);
  return modules.join('\n\n');
}

/**
 * Inline font files referenced in CSS as base64 data URIs.
 * Replaces url('../fonts/...') with data:font/woff2;base64,...
 */
function inlineFonts(css) {
  return css.replace(/url\(['"]?(\.\.\/fonts\/[^'")\s]+)['"]?\)/g, (match, fontPath) => {
    const absPath = join(SRC_DIR, 'css', fontPath);
    if (existsSync(absPath)) {
      const fontData = readFileSync(absPath);
      const base64 = fontData.toString('base64');
      return `url('data:font/woff2;base64,${base64}')`;
    }
    console.warn(`Font file not found: ${absPath}`);
    return match;
  });
}

/**
 * Collect all CSS files referenced in the HTML.
 */
function collectCSS(html) {
  // Flexible regex: match link tags with rel="stylesheet" and href in any order
  const cssRegex = /<link\s+(?=[^>]*rel="stylesheet")[^>]*href="([^"]+)"[^>]*\/?>/g;
  const cssContents = [];
  let match;

  while ((match = cssRegex.exec(html)) !== null) {
    const cssPath = join(SRC_DIR, match[1]);
    if (existsSync(cssPath)) {
      cssContents.push(`/* --- ${match[1]} --- */\n${readFile(cssPath).trim()}`);
    }
  }

  return cssContents.join('\n\n');
}

/**
 * Build the single-file HTML.
 */
function build() {
  console.log('Building TempoMate...');

  // Ensure dist directory exists
  if (!existsSync(DIST_DIR)) {
    mkdirSync(DIST_DIR, { recursive: true });
  }

  // Read HTML template
  let html = readFile(HTML_FILE);

  // Collect and inline CSS (with embedded fonts)
  const allCSS = inlineFonts(collectCSS(html));

  // Remove CSS link tags
  html = html.replace(/<link\s+rel="stylesheet"\s+href="[^"]+"\s*\/?>\n?/g, '');

  // Collect and inline JS
  const jsMatch = html.match(/<script\s+type="module"\s+src="([^"]+)"\s*><\/script>/);
  let allJS = '';
  if (jsMatch) {
    const jsEntryPath = join(SRC_DIR, jsMatch[1]);
    allJS = resolveModules(jsEntryPath);
  }

  // Remove script tags
  html = html.replace(/<script\s+type="module"\s+src="[^"]+"\s*><\/script>\n?/g, '');

  // Insert inlined CSS before </head>
  html = html.replace(
    '</head>',
    `  <style>\n${allCSS}\n  </style>\n</head>`,
  );

  // Remove the source auto-init block (it's already guarded, but the build injects its own)
  allJS = allJS.replace(/\/\/ Auto-initialize when DOM is ready[\s\S]*$/, '');

  // Insert inlined JS before </body>
  html = html.replace(
    '</body>',
    `  <script>\n${allJS}\n\n// Auto-initialize\nif (!window.__tempoMateApp) {\n  document.addEventListener('DOMContentLoaded', () => {\n    if (!window.__tempoMateApp) {\n      const app = new App();\n      app.init();\n      window.__tempoMateApp = app;\n    }\n  });\n}\n  </script>\n</body>`,
  );

  // Write output
  const outputPath = join(DIST_DIR, 'index.html');
  writeFileSync(outputPath, html, 'utf-8');

  const sizeKB = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
  console.log(`Build complete: dist/index.html (${sizeKB} KB)`);
}

build();
