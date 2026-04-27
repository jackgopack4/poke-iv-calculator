// IVMath.swift — Pure Gen 5 IV math. No UI dependencies.
// Swift port of the functions in app.js.
// Integer division on positive integers matches JavaScript's Math.floor() exactly.

import Foundation

// MARK: - Constants

let STATS = ["hp", "atk", "def", "spa", "spd", "spe"]

let STAT_LABELS: [String: String] = [
    "hp": "HP", "atk": "Atk", "def": "Def",
    "spa": "SpA", "spd": "SpD", "spe": "Spe"
]

struct NatureEntry {
    let up: String?
    let dn: String?
}

let NATURES: [String: NatureEntry] = [
    "hardy":   NatureEntry(up: nil,    dn: nil),
    "docile":  NatureEntry(up: nil,    dn: nil),
    "serious": NatureEntry(up: nil,    dn: nil),
    "bashful": NatureEntry(up: nil,    dn: nil),
    "quirky":  NatureEntry(up: nil,    dn: nil),
    "lonely":  NatureEntry(up: "atk", dn: "def"),
    "adamant": NatureEntry(up: "atk", dn: "spa"),
    "naughty": NatureEntry(up: "atk", dn: "spd"),
    "brave":   NatureEntry(up: "atk", dn: "spe"),
    "bold":    NatureEntry(up: "def", dn: "atk"),
    "impish":  NatureEntry(up: "def", dn: "spa"),
    "lax":     NatureEntry(up: "def", dn: "spd"),
    "relaxed": NatureEntry(up: "def", dn: "spe"),
    "modest":  NatureEntry(up: "spa", dn: "atk"),
    "mild":    NatureEntry(up: "spa", dn: "def"),
    "rash":    NatureEntry(up: "spa", dn: "spd"),
    "quiet":   NatureEntry(up: "spa", dn: "spe"),
    "calm":    NatureEntry(up: "spd", dn: "atk"),
    "gentle":  NatureEntry(up: "spd", dn: "def"),
    "careful": NatureEntry(up: "spd", dn: "spa"),
    "sassy":   NatureEntry(up: "spd", dn: "spe"),
    "timid":   NatureEntry(up: "spe", dn: "atk"),
    "hasty":   NatureEntry(up: "spe", dn: "def"),
    "jolly":   NatureEntry(up: "spe", dn: "spa"),
    "naive":   NatureEntry(up: "spe", dn: "spd"),
]

let NATURE_NAMES: [String] = [
    "none",
    "adamant", "bashful", "bold", "brave", "calm", "careful",
    "docile", "gentle", "hardy", "hasty", "impish", "jolly",
    "lax", "lonely", "mild", "modest", "naive", "naughty",
    "quiet", "quirky", "rash", "relaxed", "sassy", "serious",
    "timid"
]

let HP_TYPES = ["Fighting","Flying","Poison","Ground","Rock","Bug","Ghost","Steel",
                "Fire","Water","Grass","Electric","Psychic","Ice","Dragon","Dark"]

let HP_STAT_BITS: [String: Int] = ["hp":0, "atk":1, "def":2, "spe":3, "spa":4, "spd":5]

struct CharacteristicOption: Identifiable {
    let id: String   // e.g. "hp:0,5"
    let label: String
    let groupLabel: String
}

let CHARACTERISTICS: [CharacteristicOption] = [
    CharacteristicOption(id: "hp:0,5",  label: "Loves to eat",         groupLabel: "HP"),
    CharacteristicOption(id: "hp:1,6",  label: "Often dozes off",       groupLabel: "HP"),
    CharacteristicOption(id: "hp:2,7",  label: "Often scatters things", groupLabel: "HP"),
    CharacteristicOption(id: "hp:3,8",  label: "Scatters things often", groupLabel: "HP"),
    CharacteristicOption(id: "hp:4,9",  label: "Likes to relax",        groupLabel: "HP"),
    CharacteristicOption(id: "atk:0,5", label: "Proud of its power",    groupLabel: "Attack"),
    CharacteristicOption(id: "atk:1,6", label: "Likes to thrash about", groupLabel: "Attack"),
    CharacteristicOption(id: "atk:2,7", label: "A little quick tempered", groupLabel: "Attack"),
    CharacteristicOption(id: "atk:3,8", label: "Likes to fight",        groupLabel: "Attack"),
    CharacteristicOption(id: "atk:4,9", label: "Quick tempered",        groupLabel: "Attack"),
    CharacteristicOption(id: "def:0,5", label: "Sturdy body",           groupLabel: "Defense"),
    CharacteristicOption(id: "def:1,6", label: "Capable of taking hits",groupLabel: "Defense"),
    CharacteristicOption(id: "def:2,7", label: "Highly persistent",     groupLabel: "Defense"),
    CharacteristicOption(id: "def:3,8", label: "Good endurance",        groupLabel: "Defense"),
    CharacteristicOption(id: "def:4,9", label: "Good perseverance",     groupLabel: "Defense"),
    CharacteristicOption(id: "spa:0,5", label: "Highly curious",        groupLabel: "Sp. Atk"),
    CharacteristicOption(id: "spa:1,6", label: "Mischievous",           groupLabel: "Sp. Atk"),
    CharacteristicOption(id: "spa:2,7", label: "Thoroughly cunning",    groupLabel: "Sp. Atk"),
    CharacteristicOption(id: "spa:3,8", label: "Often lost in thought", groupLabel: "Sp. Atk"),
    CharacteristicOption(id: "spa:4,9", label: "Very finicky",          groupLabel: "Sp. Atk"),
    CharacteristicOption(id: "spd:0,5", label: "Strong willed",         groupLabel: "Sp. Def"),
    CharacteristicOption(id: "spd:1,6", label: "Somewhat vain",         groupLabel: "Sp. Def"),
    CharacteristicOption(id: "spd:2,7", label: "Strongly defiant",      groupLabel: "Sp. Def"),
    CharacteristicOption(id: "spd:3,8", label: "Hates to lose",         groupLabel: "Sp. Def"),
    CharacteristicOption(id: "spd:4,9", label: "Somewhat stubborn",     groupLabel: "Sp. Def"),
    CharacteristicOption(id: "spe:0,5", label: "Likes to run",          groupLabel: "Speed"),
    CharacteristicOption(id: "spe:1,6", label: "Alert to sounds",       groupLabel: "Speed"),
    CharacteristicOption(id: "spe:2,7", label: "Impetuous and silly",   groupLabel: "Speed"),
    CharacteristicOption(id: "spe:3,8", label: "Somewhat of a clown",   groupLabel: "Speed"),
    CharacteristicOption(id: "spe:4,9", label: "Quick to flee",         groupLabel: "Speed"),
]

// MARK: - Core math (mirrors app.js exactly)

func calcHP(base: Int, iv: Int, ev: Int, level: Int) -> Int {
    ((2 * base + iv + ev / 4) * level) / 100 + level + 10
}

func calcStat(base: Int, iv: Int, ev: Int, level: Int, natureMod: Double) -> Int {
    let raw = ((2 * base + iv + ev / 4) * level) / 100 + 5
    return Int(Double(raw) * natureMod)
}

func natureModFor(stat: String, nature: String) -> Double {
    guard nature != "none", let n = NATURES[nature] else { return 1.0 }
    if n.up == stat { return 1.1 }
    if n.dn == stat { return 0.9 }
    return 1.0
}

func possibleIVs(stat: String, base: Int, level: Int, ev: Int,
                 natureMod: Double, observed: Int) -> Set<Int> {
    var result = Set<Int>()
    for iv in 0...31 {
        let s = stat == "hp"
            ? calcHP(base: base, iv: iv, ev: ev, level: level)
            : calcStat(base: base, iv: iv, ev: ev, level: level, natureMod: natureMod)
        if s == observed { result.insert(iv) }
    }
    return result
}

func applyHPTypeFilter(possible: inout [String: Set<Int>], typeName: String) {
    guard typeName != "none",
          let typeIndex = HP_TYPES.firstIndex(where: { $0.lowercased() == typeName.lowercased() })
    else { return }

    var validNs = [Int]()
    for n in 0...63 where n * 15 / 63 == typeIndex { validNs.append(n) }

    for stat in STATS {
        guard let bit = HP_STAT_BITS[stat] else { continue }
        var parityOk = [false, false]
        for n in validNs { parityOk[(n >> bit) & 1] = true }
        possible[stat] = Set(possible[stat]?.filter { parityOk[$0 % 2] } ?? [])
    }
}
