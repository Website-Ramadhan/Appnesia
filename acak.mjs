import fs from 'node:fs';
import JavaScriptObfuscator from 'javascript-obfuscator';
const html = fs.readFileSync('app.html', 'utf8');
let n = 0;
const out = html.replace(/<script>([\s\S]*?)<\/script>/g, (m, code) => {
  n++;
  const r = JavaScriptObfuscator.obfuscate(code, {
    compact: true,
    stringArray: true,
    stringArrayThreshold: 0.75,
    stringArrayEncoding: ['base64'],
    renameGlobals: false,
    identifierNamesGenerator: 'hexadecimal',
    controlFlowFlattening: false,
    selfDefending: false,
    debugProtection: false,
    target: 'browser'
  });
  return '<script>' + r.getObfuscatedCode() + '</script>';
});
if (n === 0) { console.error('Tidak ada blok script ditemukan'); process.exit(1); }
fs.mkdirSync('www', { recursive: true });
fs.writeFileSync('www/index.html', out);
console.log('Selesai, blok script diacak:', n);
