// IVMathTests.swift
// Two test classes:
//   IVMathUnitTests  — offline, fast
//   MarrilandAPITests — live network, mirrors test_vs_marriland.js exactly
//
// Run all tests: ⌘U in Xcode
// Skip network tests: set env var SKIP_NETWORK=1 in the test scheme

import XCTest
@testable import IVCalculator

// MARK: - Offline unit tests

final class IVMathUnitTests: XCTestCase {

    // calcHP
    func testCalcHP_bulbasaur_lv5_iv31() {
        // Bulbasaur base HP = 45, iv=31, ev=0, lv=5
        // ((2*45+31+0)*5)/100 + 5 + 10 = (121*5)/100 + 15 = 6 + 15 = 21... let me recheck:
        // ((90+31)*5)/100 + 5 + 10 = (605)/100 + 15 = 6 + 15 = 21...
        // Actually: ((2*45 + 31 + 0)*5)/100 + 5 + 10 = (121*5)/100 + 15 = 605/100 + 15 = 6+15 = 21
        // Hmm but we expect 22 for iv=31. Let me recheck the formula:
        // floor(((2*base + iv + floor(ev/4)) * level) / 100) + level + 10
        // = floor((121 * 5) / 100) + 5 + 10 = floor(6.05) + 15 = 6 + 15 = 21
        // vs iv=30: floor((120*5)/100)+15 = floor(6)+15 = 6+15 = 21
        // So at lv5, iv 30 and 31 both give 21? Let me check iv=28:
        // floor((118*5)/100)+15 = floor(5.9)+15 = 5+15 = 20
        // iv=29: floor(119*5/100)+15 = floor(5.95)+15 = 5+15 = 20
        // iv=30: floor(120*5/100)+15 = floor(6)+15 = 21
        // iv=31: floor(121*5/100)+15 = floor(6.05)+15 = 21
        // So at lv5, HP IVs 30 and 31 both produce 21. Two candidates — correct.
        XCTAssertEqual(calcHP(base: 45, iv: 31, ev: 0, level: 5), 21)
        XCTAssertEqual(calcHP(base: 45, iv: 30, ev: 0, level: 5), 21)
        XCTAssertEqual(calcHP(base: 45, iv: 28, ev: 0, level: 5), 20)
    }

    func testCalcHP_bulbasaur_lv100_iv31() {
        // floor(((90+31)*100)/100) + 100 + 10 = 121 + 110 = 231
        XCTAssertEqual(calcHP(base: 45, iv: 31, ev: 0, level: 100), 231)
    }

    func testCalcHP_bulbasaur_lv100_iv0() {
        // floor(((90+0)*100)/100) + 100 + 10 = 90 + 110 = 200
        XCTAssertEqual(calcHP(base: 45, iv: 0, ev: 0, level: 100), 200)
    }

    func testCalcHP_withEVs() {
        // 4 EVs: floor(4/4) = 1 extra
        // floor((91*100)/100) + 110 = 91 + 110 = 201
        XCTAssertEqual(calcHP(base: 45, iv: 0, ev: 4, level: 100), 201)
        // 252 EVs: floor(252/4) = 63
        // floor((153*100)/100) + 110 = 153 + 110 = 263
        XCTAssertEqual(calcHP(base: 45, iv: 0, ev: 252, level: 100), 263)
    }

    // calcStat
    func testCalcStat_bulbasaur_atk_hardy_lv100_iv31() {
        // base Atk = 49, iv=31, ev=0, lv=100, natureMod=1.0
        // floor((98+31)*100/100) + 5 = 129 + 5 = 134; floor(134 * 1.0) = 134
        XCTAssertEqual(calcStat(base: 49, iv: 31, ev: 0, level: 100, natureMod: 1.0), 134)
    }

    func testCalcStat_natureMod() {
        // +10% nature
        XCTAssertEqual(calcStat(base: 49, iv: 31, ev: 0, level: 100, natureMod: 1.1), 147)
        // −10% nature
        XCTAssertEqual(calcStat(base: 49, iv: 31, ev: 0, level: 100, natureMod: 0.9), 120)
    }

    // natureModFor
    func testNatureModFor() {
        XCTAssertEqual(natureModFor(stat: "atk", nature: "adamant"), 1.1)
        XCTAssertEqual(natureModFor(stat: "spa", nature: "adamant"), 0.9)
        XCTAssertEqual(natureModFor(stat: "def", nature: "adamant"), 1.0)
        XCTAssertEqual(natureModFor(stat: "atk", nature: "hardy"),   1.0)
        XCTAssertEqual(natureModFor(stat: "atk", nature: "none"),    1.0)
    }

    // possibleIVs
    func testPossibleIVs_bulbasaur_hp_lv5_observed21() {
        let result = possibleIVs(stat: "hp", base: 45, level: 5, ev: 0, natureMod: 1.0, observed: 21)
        XCTAssertTrue(result.contains(30))
        XCTAssertTrue(result.contains(31))
        XCTAssertFalse(result.contains(29))
    }

    func testPossibleIVs_bulbasaur_hp_lv100_observed231() {
        let result = possibleIVs(stat: "hp", base: 45, level: 100, ev: 0, natureMod: 1.0, observed: 231)
        XCTAssertEqual(result, [31])
    }

    // applyHPTypeFilter
    func testHPTypeFilter_dark_requiresAllOdd() {
        var possible: [String: Set<Int>] = Dictionary(uniqueKeysWithValues: STATS.map { ($0, Set(0...31)) })
        applyHPTypeFilter(possible: &possible, typeName: "dark")
        for stat in STATS {
            // All remaining IVs must be odd
            XCTAssertTrue(possible[stat]?.allSatisfy { $0 % 2 == 1 } == true,
                          "\(stat) should only have odd IVs for Dark HP")
        }
    }

    func testHPTypeFilter_fighting_speedEvenOnly() {
        // For Fighting (type index 0), the Speed bit (bit 3) must be 0 (even)
        var possible: [String: Set<Int>] = Dictionary(uniqueKeysWithValues: STATS.map { ($0, Set(0...31)) })
        applyHPTypeFilter(possible: &possible, typeName: "fighting")
        XCTAssertTrue(possible["spe"]?.allSatisfy { $0 % 2 == 0 } == true,
                      "Fighting HP requires Speed IV to be even")
    }

    func testHPTypeFilter_none_noChange() {
        var possible: [String: Set<Int>] = Dictionary(uniqueKeysWithValues: STATS.map { ($0, Set(0...31)) })
        applyHPTypeFilter(possible: &possible, typeName: "none")
        for stat in STATS {
            XCTAssertEqual(possible[stat]?.count, 32)
        }
    }

    // EV carry-over in CalculatorState
    @MainActor
    func testAddRow_carriesEVsWhenShowEVsOn() {
        let state = CalculatorState(allSpecies: [])
        state.showEVs = true
        state.rows[0].evStrs["hp"]  = "4"
        state.rows[0].evStrs["spa"] = "252"
        state.rows[0].evStrs["spe"] = "252"
        state.addRow()
        XCTAssertEqual(state.rows[1].evStrs["hp"],  "4")
        XCTAssertEqual(state.rows[1].evStrs["spa"], "252")
        XCTAssertEqual(state.rows[1].evStrs["spe"], "252")
    }

    @MainActor
    func testAddRow_doesNotCarryEVsWhenShowEVsOff() {
        let state = CalculatorState(allSpecies: [])
        state.showEVs = false
        state.rows[0].evStrs["hp"]  = "4"
        state.rows[0].evStrs["spa"] = "252"
        state.addRow()
        XCTAssertEqual(state.rows[1].evStrs["hp"],  "")
        XCTAssertEqual(state.rows[1].evStrs["spa"], "")
    }
}

// MARK: - Live Marriland API tests (mirrors test_vs_marriland.js)

final class MarrilandAPITests: XCTestCase {

    // Base stats for species used in tests (matches test_vs_marriland.js)
    private let BASE_STATS: [String: [String: Int]] = [
        "bulbasaur": ["hp":45,"atk":49,"def":49,"spa":65,"spd":65,"spe":45],
        "cyndaquil": ["hp":39,"atk":52,"def":43,"spa":60,"spd":50,"spe":65],
        "oshawott":  ["hp":55,"atk":55,"def":45,"spa":63,"spd":45,"spe":45],
    ]

    // Marriland uses different stat key names
    private let MARRILAND_STAT_MAP: [String: String] = [
        "hp":"hp","atk":"attack","def":"defense","spa":"spatk","spd":"spdef","spe":"speed"
    ]

    // Forward-compute the observed stat value from known IVs
    private func computedStat(_ stat: String, base: Int, iv: Int, ev: Int, level: Int, nature: String) -> Int {
        let nmod = natureModFor(stat: stat, nature: nature)
        return stat == "hp"
            ? calcHP(base: base, iv: iv, ev: ev, level: level)
            : calcStat(base: base, iv: iv, ev: ev, level: level, natureMod: nmod)
    }

    // Run our Swift calculator on a test case
    private func ourResult(species: String, nature: String, levels: [Int],
                           knownIVs: [String: Int], hiddenPower: String = "none") -> [String: Set<Int>] {
        let base = BASE_STATS[species]!
        var possible: [String: Set<Int>] = Dictionary(uniqueKeysWithValues: STATS.map { ($0, Set(0...31)) })
        for level in levels {
            for stat in STATS {
                guard let iv = knownIVs[stat] else { continue }
                let observed = computedStat(stat, base: base[stat]!, iv: iv, ev: 0, level: level, nature: nature)
                let nmod = natureModFor(stat: stat, nature: nature)
                let cands = possibleIVs(stat: stat, base: base[stat]!, level: level, ev: 0,
                                        natureMod: nmod, observed: observed)
                possible[stat] = possible[stat]!.intersection(cands)
            }
        }
        applyHPTypeFilter(possible: &possible, typeName: hiddenPower)
        return possible
    }

    // POST to Marriland and return possible_ivs keyed by our stat names
    private func callMarriland(species: String, nature: String, levels: [Int],
                               knownIVs: [String: Int], hiddenPower: String = "none") async throws -> [String: [Int]] {
        var params: [(String, String)] = [
            ("action",      "marriland_iv_calculator"),
            ("generation",  "5"),
            ("name",        species),
            ("nature",      nature == "none" ? "" : nature),
            ("characteristic", "none"),
            ("hidden_power", hiddenPower == "none" ? "none" : hiddenPower.lowercased()),
        ]
        let base = BASE_STATS[species]!
        for (i, level) in levels.enumerated() {
            params.append(("levels[\(i)][level]", "\(level)"))
            for stat in STATS {
                guard let iv = knownIVs[stat] else { continue }
                let mKey = MARRILAND_STAT_MAP[stat]!
                let observed = computedStat(stat, base: base[stat]!, iv: iv, ev: 0, level: level, nature: nature)
                params.append(("levels[\(i)][stats][\(mKey)]", "\(observed)"))
            }
        }

        let body = params
            .map { k, v in "\(k.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)=\(v.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)" }
            .joined(separator: "&")

        var request = URLRequest(url: URL(string: "https://marriland.com/wp-admin/admin-ajax.php")!)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = body.data(using: .utf8)
        request.timeoutInterval = 10

        let (data, _) = try await URLSession.shared.data(for: request)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let possibleIVs = json?["possible_ivs"] as? [String: Any] else {
            throw URLError(.cannotParseResponse)
        }

        var result = [String: [Int]]()
        for stat in STATS {
            let mKey = MARRILAND_STAT_MAP[stat]!
            result[stat] = (possibleIVs[mKey] as? [Int]) ?? []
        }
        return result
    }

    // Generic test runner: verifies known IV is in both our result and Marriland's,
    // and that our set is a subset of Marriland's.
    private func runTest(label: String, species: String, nature: String, levels: [Int],
                         knownIVs: [String: Int], hiddenPower: String = "none") async throws {
        try XCTSkipIf(ProcessInfo.processInfo.environment["SKIP_NETWORK"] != nil,
                      "Skipping network test (SKIP_NETWORK set)")

        let ours = ourResult(species: species, nature: nature, levels: levels,
                             knownIVs: knownIVs, hiddenPower: hiddenPower)

        // Verify our result contains the known IVs
        for stat in STATS {
            guard let iv = knownIVs[stat] else { continue }
            XCTAssertTrue(ours[stat]?.contains(iv) == true,
                          "[\(label)] Our result missing known \(stat) IV=\(iv), got: \(ours[stat]?.sorted() ?? [])")
        }

        // Cross-check against Marriland
        let marriland = try await callMarriland(species: species, nature: nature, levels: levels,
                                               knownIVs: knownIVs, hiddenPower: hiddenPower)
        try await Task.sleep(nanoseconds: 300_000_000) // 0.3s polite delay

        for stat in STATS {
            guard let iv = knownIVs[stat] else { continue }
            let mVals = Set(marriland[stat] ?? [])
            let ourVals = ours[stat] ?? Set()

            XCTAssertTrue(mVals.contains(iv),
                          "[\(label)] Known \(stat) IV=\(iv) missing from Marriland: \(mVals.sorted())")
            XCTAssertTrue(ourVals.isSubset(of: mVals),
                          "[\(label)] Our \(stat) IVs not a subset of Marriland's: ours=\(ourVals.sorted()) marriland=\(mVals.sorted())")
        }
    }

    // ── Bulbasaur ────────────────────────────────────────────────────────────

    func testBulbasaur_hardy_all31_lv100() async throws {
        try await runTest(label: "Bulbasaur hardy all-31 lv100",
                          species: "bulbasaur", nature: "hardy", levels: [100],
                          knownIVs: ["hp":31,"atk":31,"def":31,"spa":31,"spd":31,"spe":31])
    }

    func testBulbasaur_hardy_all0_lv100() async throws {
        try await runTest(label: "Bulbasaur hardy all-0 lv100",
                          species: "bulbasaur", nature: "hardy", levels: [100],
                          knownIVs: ["hp":0,"atk":0,"def":0,"spa":0,"spd":0,"spe":0])
    }

    func testBulbasaur_adamant_mixed_lv50() async throws {
        try await runTest(label: "Bulbasaur adamant mixed lv50",
                          species: "bulbasaur", nature: "adamant", levels: [50],
                          knownIVs: ["hp":20,"atk":31,"def":15,"spa":12,"spd":25,"spe":8])
    }

    func testBulbasaur_adamant_all31_lv100() async throws {
        try await runTest(label: "Bulbasaur adamant all-31 lv100",
                          species: "bulbasaur", nature: "adamant", levels: [100],
                          knownIVs: ["hp":31,"atk":31,"def":31,"spa":31,"spd":31,"spe":31])
    }

    func testBulbasaur_modest_multiLevel_lv5_lv25() async throws {
        try await runTest(label: "Bulbasaur modest multi-level lv5+lv25",
                          species: "bulbasaur", nature: "modest", levels: [5, 25],
                          knownIVs: ["hp":17,"atk":9,"def":22,"spa":31,"spd":18,"spe":14])
    }

    // ── Cyndaquil ────────────────────────────────────────────────────────────

    func testCyndaquil_timid_all31_lv100() async throws {
        try await runTest(label: "Cyndaquil timid all-31 lv100",
                          species: "cyndaquil", nature: "timid", levels: [100],
                          knownIVs: ["hp":31,"atk":31,"def":31,"spa":31,"spd":31,"spe":31])
    }

    func testCyndaquil_hardy_all0_lv100() async throws {
        try await runTest(label: "Cyndaquil hardy all-0 lv100",
                          species: "cyndaquil", nature: "hardy", levels: [100],
                          knownIVs: ["hp":0,"atk":0,"def":0,"spa":0,"spd":0,"spe":0])
    }

    func testCyndaquil_modest_mixed_lv50() async throws {
        try await runTest(label: "Cyndaquil modest mixed lv50",
                          species: "cyndaquil", nature: "modest", levels: [50],
                          knownIVs: ["hp":25,"atk":10,"def":20,"spa":31,"spd":15,"spe":28])
    }

    func testCyndaquil_timid_all31_multiLevel() async throws {
        try await runTest(label: "Cyndaquil timid all-31 lv10+lv50+lv100",
                          species: "cyndaquil", nature: "timid", levels: [10, 50, 100],
                          knownIVs: ["hp":31,"atk":31,"def":31,"spa":31,"spd":31,"spe":31])
    }

    // ── Oshawott ─────────────────────────────────────────────────────────────

    func testOshawott_jolly_all31_lv100() async throws {
        try await runTest(label: "Oshawott jolly all-31 lv100",
                          species: "oshawott", nature: "jolly", levels: [100],
                          knownIVs: ["hp":31,"atk":31,"def":31,"spa":31,"spd":31,"spe":31])
    }

    func testOshawott_hardy_all0_lv100() async throws {
        try await runTest(label: "Oshawott hardy all-0 lv100",
                          species: "oshawott", nature: "hardy", levels: [100],
                          knownIVs: ["hp":0,"atk":0,"def":0,"spa":0,"spd":0,"spe":0])
    }

    func testOshawott_sassy_mixed_lv50() async throws {
        try await runTest(label: "Oshawott sassy mixed lv50",
                          species: "oshawott", nature: "sassy", levels: [50],
                          knownIVs: ["hp":18,"atk":5,"def":29,"spa":14,"spd":31,"spe":3])
    }

    func testOshawott_jolly_multiLevel_lv5_lv20() async throws {
        try await runTest(label: "Oshawott jolly multi-level lv5+lv20",
                          species: "oshawott", nature: "jolly", levels: [5, 20],
                          knownIVs: ["hp":24,"atk":19,"def":7,"spa":11,"spd":26,"spe":31])
    }

    // ── Hidden Power type filtering ──────────────────────────────────────────

    func testBulbasaur_hardy_fightingHP_lv50() async throws {
        try await runTest(label: "Bulbasaur hardy Fighting HP lv50",
                          species: "bulbasaur", nature: "hardy", levels: [50],
                          knownIVs: ["hp":31,"atk":30,"def":30,"spe":28,"spa":30,"spd":30],
                          hiddenPower: "fighting")
    }

    func testBulbasaur_hardy_darkHP_lv50() async throws {
        try await runTest(label: "Bulbasaur hardy Dark HP lv50",
                          species: "bulbasaur", nature: "hardy", levels: [50],
                          knownIVs: ["hp":31,"atk":31,"def":31,"spe":31,"spa":31,"spd":31],
                          hiddenPower: "dark")
    }

    func testCyndaquil_modest_dragonHP_lv5_lv25() async throws {
        try await runTest(label: "Cyndaquil modest Dragon HP lv5+lv25",
                          species: "cyndaquil", nature: "modest", levels: [5, 25],
                          knownIVs: ["hp":30,"atk":29,"def":28,"spe":31,"spa":31,"spd":31],
                          hiddenPower: "dragon")
    }
}
