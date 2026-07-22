const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../../src');

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        arrayOfFiles.push(filePath);
      }
    }
  });

  return arrayOfFiles;
}

const allFiles = getAllFiles(srcDir);
console.log(`Found ${allFiles.length} files in src/`);

const findings = {
  emptyCatches: [],
  swallowedPromises: [],
  eslintExhaustiveDepsDisabled: [],
  uncleanedListenersOrTimers: [],
  deadLinks: [],
  asyncButtonsNoDisable: []
};

allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(path.join(__dirname, '../..'), file).replace(/\\/g, '/');

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // 1. Empty catch block
    if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line) || /catch\s*\{\s*\}/.test(line)) {
      findings.emptyCatches.push({ file: relPath, lineNum, text: line.trim() });
    }

    // 2. Swallowed promise catch: .catch(() => {}) or .catch(() => null) or .catch(e => {}) or .catch(() => setX(""))
    if (/\.catch\(\s*\(\s*([a-zA-Z0-9_]*)\s*\)\s*=>\s*\{?\s*(null|\{\}|"")?\s*\}?\s*\)/.test(line) || /\.catch\(\(\)\s*=>\s*\{\}\)/.test(line)) {
      findings.swallowedPromises.push({ file: relPath, lineNum, text: line.trim() });
    }

    // 3. Exhaustive deps disabled
    if (line.includes('react-hooks/exhaustive-deps')) {
      findings.eslintExhaustiveDepsDisabled.push({ file: relPath, lineNum, text: line.trim() });
    }

    // 4. Timers / Event Listeners check
    if (line.includes('setInterval(') || line.includes('addEventListener(') || line.includes('setTimeout(')) {
      findings.uncleanedListenersOrTimers.push({ file: relPath, lineNum, text: line.trim() });
    }

    // 5. Dead links
    if (/href=["'](#|#\/|javascript:void\(0\)|)["']/.test(line) || /to=["'](#|#\/|)["']/.test(line)) {
      findings.deadLinks.push({ file: relPath, lineNum, text: line.trim() });
    }
  });
});

console.log('\n--- FINDINGS SUMMARY ---');
console.log('Empty catches:', findings.emptyCatches.length);
console.log(JSON.stringify(findings.emptyCatches, null, 2));

console.log('\nSwallowed promise catches:', findings.swallowedPromises.length);
console.log(JSON.stringify(findings.swallowedPromises, null, 2));

console.log('\nDisabled exhaustive-deps:', findings.eslintExhaustiveDepsDisabled.length);
console.log(JSON.stringify(findings.eslintExhaustiveDepsDisabled, null, 2));

console.log('\nDead links:', findings.deadLinks.length);
console.log(JSON.stringify(findings.deadLinks, null, 2));
