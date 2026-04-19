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
// POKEMON is defined in pokemon-data.js (loaded before this script).
// Build a dex-order sorted list for the search UI.
var POKEMON_LIST = Object.keys(POKEMON).sort(function(a, b) {
  return POKEMON[a].dex - POKEMON[b].dex;
});

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
var state = {
  species: null,
  nature: "none",
  characteristic: "none",
  showEVs: false,
  rows: [
    { level: "", stats: {}, evs: {} }
  ],
};

// ─── Species search UI ───
var speciesInput    = document.getElementById("species-input");
var speciesDropdown = document.getElementById("species-dropdown");
var speciesSelected = document.getElementById("species-selected");

function dexPad(n) {
  return "#" + String(n).padStart(3, "0");
}

function renderDropdown(matches) {
  speciesDropdown.innerHTML = "";
  if (matches.length === 0) {
    speciesDropdown.hidden = true;
    return;
  }
  matches.forEach(function(key) {
    var mon = POKEMON[key];
    var div = document.createElement("div");
    div.className = "species-option";
    div.setAttribute("data-key", key);
    var dexSpan = document.createElement("span");
    dexSpan.className = "opt-dex";
    dexSpan.textContent = dexPad(mon.dex);
    div.appendChild(dexSpan);
    div.appendChild(document.createTextNode(mon.name));
    speciesDropdown.appendChild(div);
  });
  speciesDropdown.hidden = false;
}

function selectSpecies(key) {
  state.species = key;
  speciesInput.value = "";
  speciesDropdown.hidden = true;
  var mon = POKEMON[key];
  speciesSelected.innerHTML = "";
  var dexSpan = document.createElement("span");
  dexSpan.className = "sel-dex";
  dexSpan.textContent = dexPad(mon.dex);
  var nameSpan = document.createElement("span");
  nameSpan.textContent = mon.name;
  var clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "sel-clear";
  clearBtn.textContent = "\u00d7";
  clearBtn.setAttribute("aria-label", "Clear selection");
  clearBtn.addEventListener("click", function() {
    resetAll();
    speciesInput.focus();
  });
  speciesSelected.appendChild(dexSpan);
  speciesSelected.appendChild(nameSpan);
  speciesSelected.appendChild(clearBtn);
  speciesSelected.hidden = false;
  recompute();
}

speciesInput.addEventListener("input", function() {
  var q = speciesInput.value.trim().toLowerCase();
  if (q === "") { speciesDropdown.hidden = true; return; }
  var isNum = /^\d+$/.test(q);
  var matches = POKEMON_LIST.filter(function(key) {
    var mon = POKEMON[key];
    if (isNum) return String(mon.dex).startsWith(q);
    return mon.name.toLowerCase().indexOf(q) !== -1;
  }).slice(0, 50);
  renderDropdown(matches);
});

speciesInput.addEventListener("keydown", function(e) {
  if (e.key === "Escape") { speciesDropdown.hidden = true; }
});

speciesInput.addEventListener("blur", function() {
  setTimeout(function() { speciesDropdown.hidden = true; }, 180);
});

speciesDropdown.addEventListener("click", function(e) {
  var opt = e.target.closest(".species-option");
  if (!opt) return;
  selectSpecies(opt.getAttribute("data-key"));
});

// ─── Reset ───
function resetAll() {
  state.species = null;
  state.nature = "none";
  state.characteristic = "none";
  state.showEVs = false;
  state.rows = [{ level: "", stats: {}, evs: {} }];
  speciesSelected.hidden = true;
  speciesInput.value = "";
  speciesDropdown.hidden = true;
  document.getElementById("nature").value = "none";
  document.getElementById("characteristic").value = "none";
  document.getElementById("ev-toggle").checked = false;
  renderTable();
  recompute();
}
document.getElementById("reset-btn").addEventListener("click", resetAll);

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
  const statusEl = document.getElementById("status");
  const resultsEl = document.getElementById("stat-results");

  if (!state.species) {
    statusEl.className = "result-status idle";
    statusEl.textContent = "Search for a Pokémon above to begin.";
    resultsEl.innerHTML = "";
    return;
  }

  const mon = POKEMON[state.species];

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

  // Compute "next useful level" hints — the lowest level above currentMax where
  // at least two candidate IVs would produce different observed stats, meaning
  // entering that level's stats would narrow the set.
  var maxLv = 0;
  var evForHint = {};
  state.rows.forEach(function(row) {
    var lv = parseInt(row.level);
    if (lv > maxLv) {
      maxLv = lv;
      STATS.forEach(function(s) {
        evForHint[s] = state.showEVs ? (parseInt(row.evs[s]) || 0) : 0;
      });
    }
  });

  var nextUsefulLevel = {};
  if (maxLv > 0 && !hasConflict) {
    STATS.forEach(function(stat) {
      var C = possible[stat];
      if (C.size <= 1) { nextUsefulLevel[stat] = null; return; }
      var base = mon[stat];
      var nmod = natureModFor(stat, state.nature);
      var ev = evForHint[stat] || 0;
      var found = null;
      var ivArr = [];
      C.forEach(function(iv) { ivArr.push(iv); });
      for (var lv = maxLv + 1; lv <= 100 && found === null; lv++) {
        var statVals = new Set();
        for (var i = 0; i < ivArr.length; i++) {
          statVals.add(stat === "hp"
            ? calcHP(base, ivArr[i], ev, lv)
            : calcStat(base, ivArr[i], ev, lv, nmod));
          if (statVals.size > 1) { found = lv; break; }
        }
      }
      nextUsefulLevel[stat] = found;
    });
  }

  // Render per-stat cells
  if (typeof ivTooltip !== "undefined") { ivTooltip.hidden = true; tooltipAnchor = null; }
  resultsEl.innerHTML = "";
  STATS.forEach(function(stat) {
    var cell = document.createElement("div");
    cell.className = "stat-cell";
    var vals = [];
    possible[stat].forEach(function(v) { vals.push(v); });
    vals.sort(function(a, b) { return a - b; });

    var klass = "narrow";
    var display = "";
    var detail = "";
    var ivList = "";

    if (vals.length === 0) {
      klass = "bad";
      display = "\u2014";
      detail = "impossible";
    } else if (vals.length === 1) {
      display = String(vals[0]);
      if (vals[0] === 31) klass = "perfect";
      else if (vals[0] === 0) klass = "bad";
      else klass = "narrow";
    } else if (vals.length === 32) {
      display = "?";
      detail = "any";
      klass = "";
    } else {
      display = vals[0] + "\u2013" + vals[vals.length - 1];
      detail = vals.length + " possible";
      ivList = vals.join(", ");
      klass = "narrow";
    }
    if (klass) cell.classList.add(klass);

    var nameDiv = document.createElement("div");
    nameDiv.className = "stat-name";
    nameDiv.textContent = STAT_LABELS[stat];

    var ivDiv = document.createElement("div");
    ivDiv.className = (vals.length > 1 && vals.length < 32) ? "stat-iv range" : "stat-iv";
    ivDiv.textContent = display;

    cell.appendChild(nameDiv);
    cell.appendChild(ivDiv);

    if (detail) {
      var detailDiv = document.createElement("div");
      detailDiv.className = "stat-detail" + (ivList ? " clickable" : "");
      detailDiv.textContent = detail;
      if (ivList) detailDiv.setAttribute("data-ivs", ivList);
      cell.appendChild(detailDiv);
    }

    if (vals.length > 1 && vals.length < 32 && maxLv > 0 && !hasConflict) {
      var hintDiv = document.createElement("div");
      hintDiv.className = "stat-hint";
      var nul = nextUsefulLevel[stat];
      hintDiv.textContent = nul !== null ? "\u2191Lv\u00a0" + nul : "won\u2019t narrow";
      cell.appendChild(hintDiv);
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

// ─── IV list tooltip ───
var ivTooltip = document.createElement("div");
ivTooltip.className = "iv-tooltip";
ivTooltip.hidden = true;
document.body.appendChild(ivTooltip);
var tooltipAnchor = null;

function showIVTooltip(anchor, text) {
  ivTooltip.textContent = text;
  ivTooltip.style.left = "-9999px";
  ivTooltip.style.top = "0";
  ivTooltip.hidden = false;
  var tw = ivTooltip.offsetWidth;
  var th = ivTooltip.offsetHeight;
  var rect = anchor.getBoundingClientRect();
  var left = rect.left + rect.width / 2 - tw / 2;
  var top = rect.top - th - 8;
  left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
  if (top < 8) top = rect.bottom + 8;
  ivTooltip.style.left = left + "px";
  ivTooltip.style.top = top + "px";
}

document.addEventListener("click", function(e) {
  var det = null;
  if (e.target && typeof e.target.closest === "function") {
    det = e.target.closest(".stat-detail[data-ivs]");
  }
  if (det) {
    if (!ivTooltip.hidden && tooltipAnchor === det) {
      ivTooltip.hidden = true;
      tooltipAnchor = null;
    } else {
      tooltipAnchor = det;
      showIVTooltip(det, det.getAttribute("data-ivs"));
    }
  } else if (!ivTooltip.hidden) {
    ivTooltip.hidden = true;
    tooltipAnchor = null;
  }
});

// Initial render
renderTable();
recompute();

// Service worker registration for offline PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", function() {
    navigator.serviceWorker.register("./sw.js");
  });
}
