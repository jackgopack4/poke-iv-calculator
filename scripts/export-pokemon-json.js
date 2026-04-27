// Converts pokemon-data.js (JS var POKEMON = {...}) to pokemon-data.json.
// Run once from repo root: node scripts/export-pokemon-json.js

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../pokemon-data.js'), 'utf8');

// Execute the JS to populate POKEMON in this context
const scope = {};
new Function('var POKEMON; ' + src + '; Object.assign(this, {POKEMON});').call(scope);
const POKEMON = scope.POKEMON;

const count = Object.keys(POKEMON).length;
fs.writeFileSync(
  path.join(__dirname, '../pokemon-data.json'),
  JSON.stringify(POKEMON)
);
console.log(`Wrote pokemon-data.json — ${count} entries`);
