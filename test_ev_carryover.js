// Pure-Node test for EV carry-over behavior on addRow().
// Mirrors the state logic in app.js without touching the DOM.

const STATS = ["hp", "atk", "def", "spa", "spd", "spe"];

function simulateAddRow(state) {
  var lastRow = state.rows[state.rows.length - 1];
  var newEvs = {};
  if (state.showEVs && lastRow) {
    STATS.forEach(function(s) { newEvs[s] = lastRow.evs[s] || 0; });
  }
  state.rows.push({ level: "", stats: {}, evs: newEvs });
}

var passed = 0, failed = 0;

function assert(label, condition) {
  if (condition) {
    console.log("✓ " + label);
    passed++;
  } else {
    console.log("✗ " + label);
    failed++;
  }
}

// 1. EVs carry over when showEVs=true
(function() {
  var state = {
    showEVs: true,
    rows: [{ level: "10", stats: {}, evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 } }]
  };
  simulateAddRow(state);
  var r = state.rows[1];
  assert("EVs carry over when showEVs=true",
    r.evs.hp === 4 && r.evs.spa === 252 && r.evs.spe === 252 && r.evs.atk === 0);
})();

// 2. EVs do NOT carry over when showEVs=false
(function() {
  var state = {
    showEVs: false,
    rows: [{ level: "10", stats: {}, evs: { hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 } }]
  };
  simulateAddRow(state);
  var r = state.rows[1];
  var hasEvs = STATS.some(function(s) { return r.evs[s] > 0; });
  assert("EVs do NOT carry over when showEVs=false", !hasEvs);
})();

// 3. Stats and level are never copied
(function() {
  var state = {
    showEVs: true,
    rows: [{ level: "50", stats: { hp: 80, atk: 55 }, evs: { hp: 4, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }]
  };
  simulateAddRow(state);
  var r = state.rows[1];
  var hasStats = STATS.some(function(s) { return r.stats[s]; });
  assert("New row has empty stats and blank level", !hasStats && r.level === "");
})();

// 4. No previous row — no crash, empty EVs
(function() {
  var state = { showEVs: true, rows: [] };
  simulateAddRow(state);
  var r = state.rows[0];
  var hasEvs = STATS.some(function(s) { return r.evs[s] > 0; });
  assert("Empty rows array: new row has empty EVs (no crash)", !hasEvs);
})();

console.log("\n" + passed + " passed, " + failed + " failed");
process.exit(failed > 0 ? 1 : 0);
