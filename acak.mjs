import fs from 'node:fs';
import JavaScriptObfuscator from 'javascript-obfuscator';

// ============================================================
// BUILD APK 1: APPNESIA USER
// ============================================================
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
if (n === 0) { console.error('Tidak ada blok script di app.html'); process.exit(1); }

fs.mkdirSync('www', { recursive: true });
fs.writeFileSync('www/index.html', out);

const fileUser = ['toko.html', 'bayar.html', 'sw.js'];
fileUser.forEach(function(f){
  if(fs.existsSync(f)){
    fs.copyFileSync(f, 'www/' + f);
    console.log('APK User - Disalin:', f);
  } else {
    console.warn('APK User - Tidak ditemukan:', f);
  }
});

// ============================================================
// BUILD APK 2: APPNESIA DEVELOPER
// ============================================================
const htmlDev = fs.readFileSync('developer.html', 'utf8');
let nDev = 0;
const outDev = htmlDev.replace(/<script>([\s\S]*?)<\/script>/g, (m, code) => {
  nDev++;
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
if (nDev === 0) { console.error('Tidak ada blok script di developer.html'); process.exit(1); }

fs.mkdirSync('www-dev', { recursive: true });
fs.writeFileSync('www-dev/index.html', outDev);
console.log('APK Developer - index.html dibuat dari developer.html');

if(fs.existsSync('login.html')){
  fs.copyFileSync('login.html', 'www-dev/login.html');
  console.log('APK Developer - Disalin: login.html');
}
if(fs.existsSync('developer.html')){
  fs.copyFileSync('developer.html', 'www-dev/developer.html');
  console.log('APK Developer - Disalin: developer.html');
}
if(fs.existsSync('sw.js')){
  fs.copyFileSync('sw.js', 'www-dev/sw.js');
  console.log('APK Developer - Disalin: sw.js');
}

console.log('');
console.log('========================================');
console.log('BUILD SELESAI:');
console.log('- www/       → APK User (dari app.html)');
console.log('- www-dev/   → APK Developer (dari developer.html)');
console.log('========================================');
