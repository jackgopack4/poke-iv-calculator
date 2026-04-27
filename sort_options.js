// One-time script: alphabetize <option> elements inside each <optgroup> in index.html.
// Sort key = first word of option text (handles "Hardy (+Atk/−Def)" → "Hardy").
// Run once with: node sort_options.js
// Safe to re-run (idempotent).

const fs = require('fs');
const FILE = 'index.html';

function sortKey(optionLine) {
  const m = optionLine.match(/<option[^>]*>(.*?)<\/option>/);
  return m ? m[1].trim().split(/\s/)[0].toLowerCase() : '';
}

const lines = fs.readFileSync(FILE, 'utf8').split('\n');
const out = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];

  if (/<optgroup/.test(line)) {
    out.push(line);
    i++;

    const bucket = [];
    while (i < lines.length && !/<\/optgroup>/.test(lines[i])) {
      bucket.push(lines[i]);
      i++;
    }

    const optLines = bucket.filter(l => /<option/.test(l));
    const rest    = bucket.filter(l => !/<option/.test(l));

    optLines.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

    rest.forEach(l => out.push(l));       // any non-option lines (unlikely but safe)
    optLines.forEach(l => out.push(l));

    if (i < lines.length) { out.push(lines[i]); i++; } // </optgroup>
  } else {
    out.push(line);
    i++;
  }
}

fs.writeFileSync(FILE, out.join('\n'));
console.log('Done — options sorted within each optgroup.');
