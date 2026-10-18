// Inline the built model lab's script and styles into a single HTML page.
// Usage: node scripts/inline-lab.mjs <out.html> [--fragment]
// --fragment drops the doctype/html/head/body wrapper (for hosts that add their own).
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = 'dist-lab';
const out = process.argv[2] || join(dir, 'jehol-model-lab.html');
const fragment = process.argv.includes('--fragment');
let html = readFileSync(join(dir, 'models.html'), 'utf8');
html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (_, f) => `<style>\n${readFileSync(join(dir, f), 'utf8')}\n</style>`);
html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/g, (_, f) => `<script type="module">\n${readFileSync(join(dir, f), 'utf8').replace(/<\/script/g, '<\\/script')}\n</script>`);
if (fragment) {
    const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
        .replace(/<meta charset[^>]*>\s*/, '')
        .replace(/<meta name="viewport"[^>]*>\s*/, '');
    const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
    html = `${head.trim()}\n${body.trim()}\n`;
}
writeFileSync(out, html);
console.log(`${out}: ${(html.length / 1024).toFixed(0)} KB`);
