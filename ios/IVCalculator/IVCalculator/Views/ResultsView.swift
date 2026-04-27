import SwiftUI

struct ResultsView: View {
    let results: IVResults

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            statusBanner

            if results.anyInputs && !results.stats.isEmpty {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 6), spacing: 4) {
                    ForEach(STATS, id: \.self) { stat in
                        if let r = results.stats[stat] {
                            StatCell(stat: stat, result: r, maxLevel: results.maxLevel,
                                     hasConflict: results.hasConflict)
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var statusBanner: some View {
        if !results.anyInputs {
            Text("Fill in at least one level with stats to see possible IVs.")
                .font(.subheadline)
                .foregroundStyle(Color.bwInkSoft)
                .italic()
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.bwLine)
                .clipShape(RoundedRectangle(cornerRadius: 6))
        } else if results.hasConflict {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: "xmark.circle.fill").foregroundStyle(Color.bwBad)
                VStack(alignment: .leading, spacing: 2) {
                    Text("No valid IVs found.").font(.subheadline.weight(.semibold))
                    Text("Check species, nature, EVs, and that stat values are read from the in-game screen.")
                        .font(.caption)
                }
            }
            .foregroundStyle(Color.bwBad)
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.bwBadSoft)
            .clipShape(RoundedRectangle(cornerRadius: 6))
        } else if results.allDetermined {
            Label("All IVs determined exactly.", systemImage: "checkmark.circle.fill")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(Color.bwAccent)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.bwAccentSoft)
                .clipShape(RoundedRectangle(cornerRadius: 6))
        } else {
            Text("\(results.pinnedCount) of 6 IVs pinned down. Level up and add another row to narrow further.")
                .font(.subheadline)
                .foregroundStyle(Color.bwInkSoft)
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.bwLine)
                .clipShape(RoundedRectangle(cornerRadius: 6))
        }
    }
}

// MARK: - Stat cell

private struct StatCell: View {
    let stat: String
    let result: StatResult
    let maxLevel: Int
    let hasConflict: Bool

    @State private var showIVList = false

    private var bgColor: Color {
        if result.isConflict { return Color.bwBadSoft }
        if result.isPerfect  { return Color.bwAccentSoft }
        if result.isZero     { return Color.bwBadSoft }
        if result.isAmbiguous && !result.isUndetermined { return Color(hex: "1a1800") }
        return Color.bwLine
    }

    private var borderColor: Color {
        if result.isConflict { return Color.bwBad }
        if result.isPerfect  { return Color.bwAccent }
        if result.isZero     { return Color.bwBad }
        return Color.bwLine
    }

    var body: some View {
        VStack(spacing: 3) {
            Text(STAT_LABELS[stat] ?? stat)
                .font(.system(size: 9, weight: .semibold))
                .textCase(.uppercase)
                .tracking(0.8)
                .foregroundStyle(result.isPerfect ? Color.bwAccentInk : Color.bwInkSoft)

            Text(result.rangeText)
                .font(.system(size: result.isAmbiguous && !result.isUndetermined ? 12 : 15,
                              design: .monospaced).weight(.semibold))
                .foregroundStyle(result.isConflict || result.isZero ? Color.bwBad
                                 : result.isPerfect ? Color.bwAccentInk : Color.bwInk)
                .minimumScaleFactor(0.6)

            if let countText = result.countText {
                Button { showIVList = true } label: {
                    Text(countText)
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundStyle(Color.bwAccent)
                        .underline(pattern: .dot)
                }
                .buttonStyle(.plain)
            }

            if result.isAmbiguous && !result.isUndetermined && maxLevel > 0 && !hasConflict {
                if let nul = result.nextUsefulLevel {
                    Text("↑Lv\u{00a0}\(nul)")
                        .font(.system(size: 9, design: .monospaced))
                        .foregroundStyle(Color.bwInkFaint)
                } else {
                    Text("won't narrow")
                        .font(.system(size: 8, design: .monospaced))
                        .foregroundStyle(Color.bwInkFaint)
                }
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 2)
        .frame(maxWidth: .infinity)
        .background(bgColor)
        .overlay(RoundedRectangle(cornerRadius: 6).stroke(borderColor, lineWidth: 1))
        .clipShape(RoundedRectangle(cornerRadius: 6))
        .sheet(isPresented: $showIVList) {
            IVListSheet(stat: stat, ivs: result.sortedIVs)
        }
    }
}

// MARK: - IV list sheet

private struct IVListSheet: View {
    let stat: String
    let ivs: [Int]
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List(ivs, id: \.self) { iv in
                Text("\(iv)")
                    .font(.system(.body, design: .monospaced))
                    .foregroundStyle(Color.bwInk)
                    .listRowBackground(Color.bwCard)
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Color.bwBackground)
            .navigationTitle("Possible \(STAT_LABELS[stat] ?? stat) IVs")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }.foregroundStyle(Color.bwAccent)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
