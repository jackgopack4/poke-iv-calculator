import Foundation
import Combine

// MARK: - Row model

struct StatRow: Identifiable {
    let id: UUID
    var levelStr: String = ""
    var statStrs: [String: String]
    var evStrs: [String: String]

    init() {
        id = UUID()
        statStrs = Dictionary(uniqueKeysWithValues: STATS.map { ($0, "") })
        evStrs   = Dictionary(uniqueKeysWithValues: STATS.map { ($0, "") })
    }

    // Parsed values used by the math
    var level: Int? {
        guard let v = Int(levelStr), v >= 1, v <= 100 else { return nil }
        return v
    }
    func statValue(_ s: String) -> Int? {
        guard let v = Int(statStrs[s] ?? ""), v > 0 else { return nil }
        return v
    }
    func evValue(_ s: String) -> Int {
        min(252, max(0, Int(evStrs[s] ?? "") ?? 0))
    }

    // Copy EVs from another row (used when adding a new row while showEVs is on)
    mutating func copyEVs(from other: StatRow) {
        evStrs = other.evStrs
    }
}

// MARK: - Results

struct StatResult {
    let possible: Set<Int>
    let nextUsefulLevel: Int?

    var isConflict: Bool    { possible.isEmpty }
    var isPerfect: Bool     { possible == [31] }
    var isZero: Bool        { possible == [0] }
    var isAmbiguous: Bool   { possible.count > 1 }
    var isUndetermined: Bool { possible.count == 32 }

    var sortedIVs: [Int]    { possible.sorted() }
    var rangeText: String {
        let s = sortedIVs
        if s.isEmpty          { return "—" }
        if s.count == 1       { return "\(s[0])" }
        if s.count == 32      { return "?" }
        return "\(s.first!)–\(s.last!)"
    }
    var countText: String? {
        if possible.isEmpty || possible.count == 1 || possible.count == 32 { return nil }
        return "\(possible.count) possible"
    }
}

struct IVResults {
    var stats: [String: StatResult] = [:]
    var anyInputs: Bool = false
    var hasConflict: Bool = false
    var maxLevel: Int = 0

    static var empty: IVResults { IVResults() }

    var allDetermined: Bool {
        anyInputs && !hasConflict && stats.values.allSatisfy { $0.possible.count == 1 }
    }
    var pinnedCount: Int {
        stats.values.filter { $0.possible.count == 1 }.count
    }
}

// MARK: - State

@MainActor
class CalculatorState: ObservableObject {
    let allSpecies: [PokemonSpecies]

    @Published var species: PokemonSpecies?       { didSet { compute() } }
    @Published var nature: String = "none"        { didSet { compute() } }
    @Published var characteristic: String = "none"{ didSet { compute() } }
    @Published var hiddenPower: String = "none"   { didSet { compute() } }
    @Published var showEVs: Bool = false          { didSet { compute() } }
    @Published var rows: [StatRow] = [StatRow()]  { didSet { compute() } }
    @Published private(set) var results: IVResults = .empty

    init(allSpecies: [PokemonSpecies]) {
        self.allSpecies = allSpecies
    }

    func addRow() {
        var newRow = StatRow()
        if showEVs, let last = rows.last {
            newRow.copyEVs(from: last)
        }
        rows.append(newRow)
    }

    func deleteRow(at offsets: IndexSet) {
        guard rows.count > 1 else { return }
        rows.remove(atOffsets: offsets)
    }

    func resetModifiers() {
        nature = "none"
        characteristic = "none"
        hiddenPower = "none"
        showEVs = false
        rows = [StatRow()]
    }

    func resetAll() {
        species = nil
        resetModifiers()
    }

    // MARK: Computation (mirrors recompute() in app.js)

    func compute() {
        guard let mon = species else {
            results = .empty
            return
        }

        var possible: [String: Set<Int>] = Dictionary(
            uniqueKeysWithValues: STATS.map { ($0, Set(0...31)) }
        )

        var anyInputs = false
        var maxLv = 0
        var evForHint: [String: Int] = Dictionary(uniqueKeysWithValues: STATS.map { ($0, 0) })

        for row in rows {
            guard let lv = row.level else { continue }
            if lv > maxLv {
                maxLv = lv
                for s in STATS { evForHint[s] = showEVs ? row.evValue(s) : 0 }
            }
            for stat in STATS {
                guard let observed = row.statValue(stat) else { continue }
                anyInputs = true
                let ev = showEVs ? row.evValue(stat) : 0
                let nmod = natureModFor(stat: stat, nature: nature)
                let cands = possibleIVs(stat: stat, base: mon.base(for: stat),
                                        level: lv, ev: ev, natureMod: nmod, observed: observed)
                possible[stat] = possible[stat]!.intersection(cands)
            }
        }

        // Characteristic filter
        if characteristic != "none" {
            let parts = characteristic.split(separator: ":")
            if parts.count == 2,
               let lo = parts[1].split(separator: ",").first.flatMap({ Int($0) }) {
                let stat = String(parts[0])
                var charSet = Set<Int>()
                var v = lo; while v <= 31 { charSet.insert(v); v += 5 }
                possible[stat] = possible[stat]!.intersection(charSet)
            }
        }

        // Hidden Power filter
        applyHPTypeFilter(possible: &possible, typeName: hiddenPower)

        let hasConflict = possible.values.contains { $0.isEmpty }

        // Next-useful-level hints
        var statResults = [String: StatResult]()
        for stat in STATS {
            var nextUseful: Int? = nil
            if maxLv > 0 && !hasConflict, let ivSet = possible[stat], ivSet.count > 1 {
                let base = mon.base(for: stat)
                let nmod = natureModFor(stat: stat, nature: nature)
                let ev = evForHint[stat] ?? 0
                let ivArr = ivSet.sorted()
                outer: for lv in (maxLv + 1)...100 {
                    var seen = Set<Int>()
                    for iv in ivArr {
                        let s = stat == "hp"
                            ? calcHP(base: base, iv: iv, ev: ev, level: lv)
                            : calcStat(base: base, iv: iv, ev: ev, level: lv, natureMod: nmod)
                        seen.insert(s)
                        if seen.count > 1 { nextUseful = lv; break outer }
                    }
                }
            }
            statResults[stat] = StatResult(possible: possible[stat] ?? [], nextUsefulLevel: nextUseful)
        }

        results = IVResults(stats: statResults, anyInputs: anyInputs,
                            hasConflict: hasConflict, maxLevel: maxLv)
    }
}
