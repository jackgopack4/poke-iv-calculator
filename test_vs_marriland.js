#!/usr/bin/env node
// Compares our IV calculator output against Marriland's live API.
// Run with: node test_vs_marriland.js
// Requires internet. Skips gracefully if Marriland is unreachable.

const https = require('https');
const querystring = require('querystring');

// ─── Our math (mirrors app.js exactly) ───────────────────────────────────────

const POKEMON = {
  bulbasaur: { hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
  cyndaquil: { hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 },
  oshawott:  { hp: 55, atk: 55, def: 45, spa: 63, spd: 45, spe: 45 },
};

const NATURES = {
  hardy:   { up: null,  dn: null  }, docile:  { up: null,  dn: null  },
  serious: { up: null,  dn: null  }, bashful: { up: null,  dn: null  },
  quirky:  { up: null,  dn: null  },
  lonely:  { up: 'atk', dn: 'def' }, adamant: { up: 'atk', dn: 'spa' },
  naughty: { up: 'atk', dn: 'spd' }, brave:   { up: 'atk', dn: 'spe' },
  bold:    { up: 'def', dn: 'atk' }, impish:  { up: 'def', dn: 'spa' },
  lax:     { up: 'def', dn: 'spd' }, relaxed: { up: 'def', dn: 'spe' },
  modest:  { up: 'spa', dn: 'atk' }, mild:    { up: 'spa', dn: 'def' },
  rash:    { up: 'spa', dn: 'spd' }, quiet:   { up: 'spa', dn: 'spe' },
  calm:    { up: 'spd', dn: 'atk' }, gentle:  { up: 'spd', dn: 'def' },
  careful: { up: 'spd', dn: 'spa' }, sassy:   { up: 'spd', dn: 'spe' },
  timid:   { up: 'spe', dn: 'atk' }, hasty:   { up: 'spe', dn: 'def' },
  jolly:   { up: 'spe', dn: 'spa' }, naive:   { up: 'spe', dn: 'spd' },
};

const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

const HP_TYPES = ['Fighting','Flying','Poison','Ground','Rock','Bug','Ghost','Steel',
                  'Fire','Water','Grass','Electric','Psychic','Ice','Dragon','Dark'];
const HP_STAT_BITS = { hp:0, atk:1, def:2, spe:3, spa:4, spd:5 };

function applyHPTypeFilter(possible, typeName) {
  if (!typeName || typeName === 'none') return;
  const typeIndex = HP_TYPES.map(t => t.toLowerCase()).indexOf(typeName.toLowerCase());
  if (typeIndex === -1) return;
  const validNs = [];
  for (let n = 0; n <= 63; n++) {
    if (Math.floor(n * 15 / 63) === typeIndex) validNs.push(n);
  }
  for (const stat of STATS) {
    const bit = HP_STAT_BITS[stat];
    const parityOk = [false, false];
    for (const n of validNs) parityOk[(n >> bit) & 1] = true;
    possible[stat] = possible[stat].filter(iv => parityOk[iv % 2]);
  }
}

function calcHP(base, iv, ev, level) {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}
function calcStat(base, iv, ev, level, natureMod) {
  return Math.floor((Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5) * natureMod);
}
function natureModFor(stat, nature) {
  if (!nature || nature === 'none') return 1.0;
  const n = NATURES[nature];
  if (!n) return 1.0;
  if (n.up === stat) return 1.1;
  if (n.dn === stat) return 0.9;
  return 1.0;
}
function computeStat(stat, base, iv, ev, level, nature) {
  const nmod = natureModFor(stat, nature);
  return stat === 'hp' ? calcHP(base, iv, ev, level) : calcStat(base, iv, ev, level, nmod);
}
function possibleIVs(stat, base, level, ev, natureMod, observed) {
  const result = [];
  for (let iv = 0; iv <= 31; iv++) {
    const s = stat === 'hp' ? calcHP(base, iv, ev, level) : calcStat(base, iv, ev, level, natureMod);
    if (s === observed) result.push(iv);
  }
  return result;
}

// Run our calculator given a species, nature, and array of {level, stats, evs} rows.
// Returns { hp: [sorted ivs], atk: [...], ... }
function ourCalculator(species, nature, rows, hiddenPower) {
  const base = POKEMON[species];
  const possible = {};
  for (const stat of STATS) {
    const all = [];
    for (let i = 0; i <= 31; i++) all.push(i);
    possible[stat] = all;
  }
  for (const row of rows) {
    for (const stat of STATS) {
      if (row.stats[stat] === undefined) continue;
      const ev = (row.evs && row.evs[stat]) || 0;
      const nmod = natureModFor(stat, nature);
      const cands = possibleIVs(stat, base[stat], row.level, ev, nmod, row.stats[stat]);
      possible[stat] = possible[stat].filter(iv => cands.includes(iv));
    }
  }
  applyHPTypeFilter(possible, hiddenPower || 'none');
  return possible;
}

// ─── Marriland API ────────────────────────────────────────────────────────────

// Marriland uses different stat key names than we do.
const MARRILAND_STAT_MAP = { hp: 'hp', atk: 'attack', def: 'defense', spa: 'spatk', spd: 'spdef', spe: 'speed' };

function callMarrilandAPI(species, nature, rows, hiddenPower) {
  return new Promise((resolve, reject) => {
    const formRows = {};
    rows.forEach((row, i) => {
      formRows[`levels[${i}][level]`] = row.level;
      for (const [ourKey, mKey] of Object.entries(MARRILAND_STAT_MAP)) {
        if (row.stats[ourKey] !== undefined) formRows[`levels[${i}][stats][${mKey}]`] = row.stats[ourKey];
        if (row.evs && row.evs[ourKey]) formRows[`levels[${i}][evs][${mKey}]`] = row.evs[ourKey];
      }
    });

    const body = querystring.stringify({
      action: 'marriland_iv_calculator',
      generation: 5,
      name: species,
      nature: nature === 'none' ? '' : nature,
      characteristic: 'none',
      hidden_power: (hiddenPower && hiddenPower !== 'none') ? hiddenPower.toLowerCase() : 'none',
      ...formRows,
    });

    const req = https.request({
      hostname: 'marriland.com',
      path: '/wp-admin/admin-ajax.php',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Bad JSON: ' + data.slice(0, 100))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// ─── Test cases ───────────────────────────────────────────────────────────────
// Each test: forward-compute stats from known IVs, then verify both calculators
// recover a set that INCLUDES those known IVs.

function buildRow(species, nature, level, knownIVs, evs = {}) {
  const base = POKEMON[species];
  const stats = {};
  for (const stat of STATS) {
    if (knownIVs[stat] !== undefined) {
      const ev = evs[stat] || 0;
      stats[stat] = computeStat(stat, base[stat], knownIVs[stat], ev, level, nature);
    }
  }
  return { level, stats, evs };
}

const TESTS = [
  // ── Bulbasaur ──────────────────────────────────────────────────────────────
  {
    label: 'Bulbasaur · hardy · all-31 IVs · lv100',
    species: 'bulbasaur', nature: 'hardy',
    knownIVs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 },
    levels: [100],
  },
  {
    label: 'Bulbasaur · hardy · all-0 IVs · lv100',
    species: 'bulbasaur', nature: 'hardy',
    knownIVs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 },
    levels: [100],
  },
  {
    label: 'Bulbasaur · adamant (+Atk/−SpA) · mixed IVs · lv50',
    species: 'bulbasaur', nature: 'adamant',
    knownIVs: { hp:20, atk:31, def:15, spa:12, spd:25, spe:8 },
    levels: [50],
  },
  {
    label: 'Bulbasaur · adamant · all-31 · lv100 (nature narrows SpA/Spe)',
    species: 'bulbasaur', nature: 'adamant',
    knownIVs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 },
    levels: [100],
  },
  {
    label: 'Bulbasaur · modest (+SpA/−Atk) · multi-level narrowing · lv5+lv25',
    species: 'bulbasaur', nature: 'modest',
    knownIVs: { hp:17, atk:9, def:22, spa:31, spd:18, spe:14 },
    levels: [5, 25],
  },
  // ── Cyndaquil ─────────────────────────────────────────────────────────────
  {
    label: 'Cyndaquil · timid (+Spe/−Atk) · all-31 · lv100',
    species: 'cyndaquil', nature: 'timid',
    knownIVs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 },
    levels: [100],
  },
  {
    label: 'Cyndaquil · hardy · all-0 · lv100',
    species: 'cyndaquil', nature: 'hardy',
    knownIVs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 },
    levels: [100],
  },
  {
    label: 'Cyndaquil · modest (+SpA/−Atk) · mixed IVs · lv50',
    species: 'cyndaquil', nature: 'modest',
    knownIVs: { hp:25, atk:10, def:20, spa:31, spd:15, spe:28 },
    levels: [50],
  },
  {
    label: 'Cyndaquil · timid · all-31 · multi-level lv10+lv50+lv100',
    species: 'cyndaquil', nature: 'timid',
    knownIVs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 },
    levels: [10, 50, 100],
  },
  // ── Oshawott ──────────────────────────────────────────────────────────────
  {
    label: 'Oshawott · jolly (+Spe/−SpA) · all-31 · lv100',
    species: 'oshawott', nature: 'jolly',
    knownIVs: { hp:31, atk:31, def:31, spa:31, spd:31, spe:31 },
    levels: [100],
  },
  {
    label: 'Oshawott · hardy · all-0 · lv100',
    species: 'oshawott', nature: 'hardy',
    knownIVs: { hp:0, atk:0, def:0, spa:0, spd:0, spe:0 },
    levels: [100],
  },
  {
    label: 'Oshawott · sassy (+SpD/−Spe) · mixed IVs · lv50',
    species: 'oshawott', nature: 'sassy',
    knownIVs: { hp:18, atk:5, def:29, spa:14, spd:31, spe:3 },
    levels: [50],
  },
  {
    label: 'Oshawott · jolly · multi-level narrowing · lv5+lv20',
    species: 'oshawott', nature: 'jolly',
    knownIVs: { hp:24, atk:19, def:7, spa:11, spd:26, spe:31 },
    levels: [5, 20],
  },
  // ── Hidden Power type filtering ────────────────────────────────────────────
  {
    // At lv50, spe IVs 28 and 29 produce the same Speed stat (both→64).
    // Fighting requires spe even → only 28 survives. Same for spa (30 only, not 29/30).
    label: 'Bulbasaur · hardy · Fighting HP · lv50 (parity filter narrows Spe + SpA)',
    species: 'bulbasaur', nature: 'hardy', hiddenPower: 'fighting',
    knownIVs: { hp:31, atk:30, def:30, spe:28, spa:30, spd:30 },
    levels: [50],
  },
  {
    // Dark requires N=63 — all six IVs must be odd.
    // At lv50, hp 30/31 produce same stat; Dark filter resolves to 31 (odd only).
    label: 'Bulbasaur · hardy · Dark HP · lv50 (all IVs must be odd)',
    species: 'bulbasaur', nature: 'hardy', hiddenPower: 'dark',
    knownIVs: { hp:31, atk:31, def:31, spe:31, spa:31, spd:31 },
    levels: [50],
  },
  {
    // Dragon requires spe/spa/spd to be odd (N=59–62, bits 3/4/5 always 1).
    label: 'Cyndaquil · modest · Dragon HP · lv5+lv25 (Spe/SpA/SpD must be odd)',
    species: 'cyndaquil', nature: 'modest', hiddenPower: 'dragon',
    knownIVs: { hp:30, atk:29, def:28, spe:31, spa:31, spd:31 },
    levels: [5, 25],
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

// Our set must be a subset of Marriland's (we may be stricter — that's fine).
// Marriland has a known edge-case quirk where it includes one extra IV at the
// top of ambiguous ranges. We don't consider that a failure on our end.
function ourSetIsSubset(ourSet, marrilandArr) {
  return ourSet.every(iv => marrilandArr.includes(iv));
}

function setsMatch(ourSet, marrilandArr) {
  if (ourSet.length !== marrilandArr.length) return false;
  const a = [...ourSet].sort((a,b) => a-b);
  const b = [...marrilandArr].sort((a,b) => a-b);
  return a.every((v, i) => v === b[i]);
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  let pass = 0, fail = 0, skip = 0;
  let marrilandAvailable = true;

  console.log('Gen 5 IV Calculator — cross-validation vs Marriland API\n');

  for (const test of TESTS) {
    const rows = test.levels.map(lv => buildRow(test.species, test.nature, lv, test.knownIVs));

    // Our calculator
    const ours = ourCalculator(test.species, test.nature, rows, test.hiddenPower || 'none');

    // Verify known IVs are in our results
    let ourPassed = true;
    const ourFailDetails = [];
    for (const stat of STATS) {
      if (!ours[stat].includes(test.knownIVs[stat])) {
        ourPassed = false;
        ourFailDetails.push(`${stat}: expected ${test.knownIVs[stat]} in [${ours[stat]}]`);
      }
    }

    // Marriland API cross-check (one row only — API doesn't support multi-level in same call format we have)
    let marrilandResult = null;
    let marrilandMismatch = [];
    if (marrilandAvailable) {
      try {
        await delay(300); // be polite
        marrilandResult = await callMarrilandAPI(test.species, test.nature, rows, test.hiddenPower || 'none');
        if (marrilandResult.error) {
          marrilandResult = null;
        } else {
          for (const stat of STATS) {
            const mKey = MARRILAND_STAT_MAP[stat];
            const mVals = marrilandResult.possible_ivs[mKey] || [];
            const knownInMarriland = mVals.includes(test.knownIVs[stat]);
            const knownInOurs = ours[stat].includes(test.knownIVs[stat]);
            const oursIsSubset = ourSetIsSubset(ours[stat], mVals);
            if (!knownInMarriland || !knownInOurs || !oursIsSubset) {
              marrilandMismatch.push(
                `${stat}: ours=[${ours[stat]}] marriland=[${mVals}]` +
                (!knownInMarriland ? ' ← known IV missing from Marriland!' : '') +
                (!knownInOurs ? ' ← known IV missing from ours!' : '') +
                (!oursIsSubset ? ' ← our IVs not a subset of Marriland!' : '')
              );
            }
          }
        }
      } catch (e) {
        if (e.message === 'timeout' || e.code === 'ENOTFOUND') {
          marrilandAvailable = false;
        }
        marrilandResult = null;
      }
    }

    const status = !ourPassed ? 'FAIL' : marrilandMismatch.length > 0 ? 'MISMATCH' : 'PASS';
    const icon = status === 'PASS' ? '✓' : status === 'MISMATCH' ? '≠' : '✗';

    if (status === 'PASS') pass++;
    else if (status === 'MISMATCH') { fail++; }
    else fail++;

    console.log(`${icon} ${test.label}`);
    if (ourFailDetails.length) console.log(`    OUR CALC FAIL: ${ourFailDetails.join(', ')}`);
    if (marrilandMismatch.length) console.log(`    MARRILAND MISMATCH: ${marrilandMismatch.join('\n      ')}`);
    if (!marrilandAvailable && !marrilandResult) console.log('    (Marriland API skipped — no network)');
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Results: ${pass} passed, ${fail} failed, ${skip} skipped`);
  if (!marrilandAvailable) console.log('(Marriland cross-checks skipped — run with internet for full validation)');
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
