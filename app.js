// Global error handler - shows error in page if anything breaks
window.addEventListener("error", function(e) {
  // Ignore resource load failures (manifest, icons, sw.js) — not JS errors
  if (e.target && e.target !== window) return;
  var banner = document.getElementById("err-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "err-banner";
    banner.style.cssText = "position:fixed;bottom:0;left:0;right:0;background:#a83232;color:white;padding:10px;font-size:12px;font-family:monospace;z-index:9999;white-space:pre-wrap;";
    document.body.appendChild(banner);
  }
  banner.textContent = "JS error: " + e.message + " (line " + e.lineno + ")";
});
// ═══════════════════════════════════════════════════════════════════
// GEN 5 BASE STATS (verified against Bulbapedia Gen V data)
// ═══════════════════════════════════════════════════════════════════
const POKEMON = {
  bulbasaur: { name: "Bulbasaur", dex: 1,   hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45 },
  cyndaquil: { name: "Cyndaquil", dex: 155, hp: 39, atk: 52, def: 43, spa: 60, spd: 50, spe: 65 },
  oshawott:  { name: "Oshawott",  dex: 501, hp: 55, atk: 55, def: 45, spa: 63, spd: 45, spe: 45 },
};

// Nature lookup: each nature maps to which stat is +10% and which is -10%.
// Neutral natures have neither.
const NATURES = {
  hardy:   { up: null,  dn: null  },
  docile:  { up: null,  dn: null  },
  serious: { up: null,  dn: null  },
  bashful: { up: null,  dn: null  },
  quirky:  { up: null,  dn: null  },
  lonely:  { up: "atk", dn: "def" },
  adamant: { up: "atk", dn: "spa" },
  naughty: { up: "atk", dn: "spd" },
  brave:   { up: "atk", dn: "spe" },
  bold:    { up: "def", dn: "atk" },
  impish:  { up: "def", dn: "spa" },
  lax:     { up: "def", dn: "spd" },
  relaxed: { up: "def", dn: "spe" },
  modest:  { up: "spa", dn: "atk" },
  mild:    { up: "spa", dn: "def" },
  rash:    { up: "spa", dn: "spd" },
  quiet:   { up: "spa", dn: "spe" },
  calm:    { up: "spd", dn: "atk" },
  gentle:  { up: "spd", dn: "def" },
  careful: { up: "spd", dn: "spa" },
  sassy:   { up: "spd", dn: "spe" },
  timid:   { up: "spe", dn: "atk" },
  hasty:   { up: "spe", dn: "def" },
  jolly:   { up: "spe", dn: "spa" },
  naive:   { up: "spe", dn: "spd" },
};

const STATS = ["hp", "atk", "def", "spa", "spd", "spe"];
const STAT_LABELS = { hp: "HP", atk: "Atk", def: "Def", spa: "SpA", spd: "SpD", spe: "Spe" };

// ═══════════════════════════════════════════════════════════════════
// CORE GEN 5 MATH
// ═══════════════════════════════════════════════════════════════════
function calcHP(base, iv, ev, level) {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}
function calcStat(base, iv, ev, level, natureMod) {
  const inner = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
  return Math.floor(inner * natureMod);
}
function natureModFor(stat, nature) {
  if (!nature || nature === "none") return 1.0;
  const n = NATURES[nature];
  if (!n) return 1.0;
  if (n.up === stat) return 1.1;
  if (n.dn === stat) return 0.9;
  return 1.0;
}

// For a given stat, level, EV, base, nature modifier, and observed stat value,
// return the set of IVs (0-31) that could produce that observed value.
function possibleIVs(stat, base, level, ev, natureMod, observed) {
  const set = new Set();
  for (let iv = 0; iv <= 31; iv++) {
    const s = stat === "hp"
      ? calcHP(base, iv, ev, level)
      : calcStat(base, iv, ev, level, natureMod);
    if (s === observed) set.add(iv);
  }
  return set;
}

function intersect(a, b) {
  const out = new Set();
  for (const v of a) if (b.has(v)) out.add(v);
  return out;
}

// ═══════════════════════════════════════════════════════════════════
// UI STATE
// ═══════════════════════════════════════════════════════════════════
let state = {
  species: "oshawott",
  nature: "none",
  characteristic: "none",
  showEVs: false,
  rows: [
    { level: "", stats: {}, evs: {} }
  ],
};

// ─── Species chips ───
document.getElementById("species-row").addEventListener("click", function(e) {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll(".chip").forEach(function(c) { c.classList.remove("selected"); });
  chip.classList.add("selected");
  state.species = chip.dataset.species;
  recompute();
});

// ─── Nature & characteristic ───
document.getElementById("nature").addEventListener("change", function(e) {
  state.nature = e.target.value;
  recompute();
});
document.getElementById("characteristic").addEventListener("change", function(e) {
  state.characteristic = e.target.value;
  recompute();
});

// ─── EV toggle ───
document.getElementById("ev-toggle").addEventListener("change", function(e) {
  state.showEVs = e.target.checked;
  renderTable();
  recompute();
});

// ─── Table rendering ───
function renderTable() {
  const body = document.getElementById("lvltbl-body");
  body.innerHTML = "";

  state.rows.forEach(function(row, idx) {
    const tr = document.createElement("tr");

    // Level input
    const lvlCell = document.createElement("td");
    const lvl = document.createElement("input");
    lvl.type = "number"; lvl.min = 1; lvl.max = 100;
    lvl.className = "lvl-input";
    lvl.setAttribute("inputmode", "numeric");
    lvl.value = row.level;
    lvl.placeholder = "Lv";
    lvl.addEventListener("input", function(e) {
      const v = e.target.value;
      row.level = v === "" ? "" : Math.max(1, Math.min(100, parseInt(v) || ""));
      recompute();
    });
    lvlCell.appendChild(lvl);
    tr.appendChild(lvlCell);

    // Six stat inputs
    STATS.forEach(function(stat) {
      const td = document.createElement("td");
      const inp = document.createElement("input");
      inp.type = "number"; inp.min = 1;
      inp.setAttribute("inputmode", "numeric");
      inp.value = (row.stats[stat] !== undefined && row.stats[stat] !== null) ? row.stats[stat] : "";
      inp.placeholder = STAT_LABELS[stat];
      inp.addEventListener("input", function(e) {
        const v = e.target.value;
        row.stats[stat] = v === "" ? "" : parseInt(v) || "";
        recompute();
      });
      td.appendChild(inp);
      tr.appendChild(td);
    });

    // Delete button (disabled on the only row)
    const delCell = document.createElement("td");
    if (state.rows.length > 1) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "row-del";
      del.textContent = "\u00d7";
      del.title = "Remove this level";
      del.addEventListener("click", function() {
        state.rows.splice(idx, 1);
        renderTable();
        recompute();
      });
      delCell.appendChild(del);
    }
    tr.appendChild(delCell);
    body.appendChild(tr);

    // Optional EV row right below
    if (state.showEVs) {
      const evTr = document.createElement("tr");
      const evLbl = document.createElement("td");
      const evSpan = document.createElement("span");
      evSpan.textContent = "EVs";
      evSpan.style.fontSize = "10px";
      evSpan.style.color = "var(--warn)";
      evSpan.style.textTransform = "uppercase";
      evSpan.style.letterSpacing = "0.08em";
      evSpan.style.fontFamily = "var(--sans)";
      evLbl.appendChild(evSpan);
      evTr.appendChild(evLbl);
      STATS.forEach(function(stat) {
        const td = document.createElement("td");
        const inp = document.createElement("input");
        inp.type = "number"; inp.min = 0; inp.max = 252;
        inp.className = "ev-input";
        inp.setAttribute("inputmode", "numeric");
        inp.value = (row.evs[stat] !== undefined && row.evs[stat] !== null) ? row.evs[stat] : "";
        inp.placeholder = "0";
        inp.addEventListener("input", function(e) {
          const v = e.target.value;
          row.evs[stat] = v === "" ? 0 : Math.max(0, Math.min(252, parseInt(v) || 0));
          recompute();
        });
        td.appendChild(inp);
        evTr.appendChild(td);
      });
      evTr.appendChild(document.createElement("td"));
      body.appendChild(evTr);
    }
  });
}

// ─── Add row button ───
document.getElementById("add-row").addEventListener("click", function() {
  state.rows.push({ level: "", stats: {}, evs: {} });
  renderTable();
  recompute();
});

// ═══════════════════════════════════════════════════════════════════
// MAIN CALCULATION LOGIC
// ═══════════════════════════════════════════════════════════════════
function recompute() {
  const mon = POKEMON[state.species];
  const statusEl = document.getElementById("status");
  const resultsEl = document.getElementById("stat-results");

  const possible = {};
  STATS.forEach(function(s) {
    const all = new Set();
    for (let i = 0; i <= 31; i++) all.add(i);
    possible[s] = all;
  });

  let anyInputs = false;
  let hasConflict = false;

  state.rows.forEach(function(row) {
    const lv = parseInt(row.level);
    if (!lv || lv < 1 || lv > 100) return;

    STATS.forEach(function(stat) {
      const observed = parseInt(row.stats[stat]);
      if (!observed || observed < 1) return;
      anyInputs = true;

      const ev = state.showEVs ? (parseInt(row.evs[stat]) || 0) : 0;
      const nmod = natureModFor(stat, state.nature);
      const cands = possibleIVs(stat, mon[stat], lv, ev, nmod, observed);
      possible[stat] = intersect(possible[stat], cands);
    });
  });

  // Apply characteristic filter if set
  if (state.characteristic !== "none") {
    const parts = state.characteristic.split(":");
    const stat = parts[0];
    const range = parts[1].split(",").map(Number);
    const lo = range[0];
    const charSet = new Set();
    for (let v = lo; v <= 31; v += 5) charSet.add(v);
    possible[stat] = intersect(possible[stat], charSet);
  }

  // Detect conflicts
  STATS.forEach(function(s) { if (possible[s].size === 0) hasConflict = true; });

  if (!anyInputs) {
    statusEl.className = "result-status idle";
    statusEl.textContent = "Fill in at least one level with stats to see possible IVs.";
    resultsEl.innerHTML = "";
    return;
  }

  if (hasConflict) {
    statusEl.className = "result-status conflict";
    statusEl.innerHTML = "<strong>No valid IVs found.</strong> Check that: species is correct, nature matches, EVs are accounted for, and stat values are read correctly from the in\u2011game screen.";
  } else {
    const totalNarrow = STATS.every(function(s) { return possible[s].size === 1; });
    if (totalNarrow) {
      statusEl.className = "result-status ok";
      statusEl.textContent = "\u2713 All IVs determined exactly.";
    } else {
      const exact = STATS.filter(function(s) { return possible[s].size === 1; }).length;
      statusEl.className = "result-status ok";
      statusEl.textContent = exact + " of 6 IVs pinned down. Level up and add another row to narrow further.";
    }
  }

  // Render per-stat cells
  resultsEl.innerHTML = "";
  STATS.forEach(function(stat) {
    const cell = document.createElement("div");
    cell.className = "stat-cell";
    const vals = [];
    possible[stat].forEach(function(v) { vals.push(v); });
    vals.sort(function(a, b) { return a - b; });

    let klass = "narrow";
    let display = "";
    let detail = "";

    if (vals.length === 0) {
      klass = "bad";
      display = "\u2014";
      detail = "impossible";
    } else if (vals.length === 1) {
      display = vals[0];
      if (vals[0] === 31) klass = "perfect";
      else if (vals[0] === 0) klass = "bad";
      else klass = "narrow";
    } else if (vals.length === 32) {
      display = "?";
      detail = "any";
      klass = "";
    } else {
      const isRange = vals[vals.length - 1] - vals[0] === vals.length - 1;
      if (isRange) {
        display = vals[0] + "\u2013" + vals[vals.length - 1];
        klass = "narrow";
      } else {
        display = vals.join(",");
        if (display.length > 11) display = vals.length + " opts";
        klass = "narrow";
      }
      detail = vals.length + " possible";
    }
    if (klass) cell.classList.add(klass);

    const ivClass = String(display).length > 3 ? "multi" : (String(display).indexOf("\u2013") !== -1 ? "range" : "");

    const nameDiv = document.createElement("div");
    nameDiv.className = "stat-name";
    nameDiv.textContent = STAT_LABELS[stat];

    const ivDiv = document.createElement("div");
    ivDiv.className = "stat-iv" + (ivClass ? " " + ivClass : "");
    ivDiv.textContent = display;

    cell.appendChild(nameDiv);
    cell.appendChild(ivDiv);

    if (detail) {
      const detailDiv = document.createElement("div");
      detailDiv.className = "stat-detail";
      detailDiv.textContent = detail;
      cell.appendChild(detailDiv);
    }

    resultsEl.appendChild(cell);
  });

  // Update column headers to reflect nature modifiers
  const theadCells = document.querySelectorAll(".lvltbl thead th");
  const n = NATURES[state.nature];
  theadCells.forEach(function(th, i) {
    th.classList.remove("nat-up", "nat-dn");
    if (i === 0 || i === 7) return;
    const stat = STATS[i - 1];
    if (n) {
      if (n.up === stat) { th.classList.add("nat-up"); th.textContent = STAT_LABELS[stat] + "\u2191"; }
      else if (n.dn === stat) { th.classList.add("nat-dn"); th.textContent = STAT_LABELS[stat] + "\u2193"; }
      else th.textContent = STAT_LABELS[stat];
    } else {
      th.textContent = STAT_LABELS[stat];
    }
  });
}

// Initial render
renderTable();
recompute();

// Service worker registration for offline PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker.register("./sw.js");
  });
}
