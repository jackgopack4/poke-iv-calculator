import SwiftUI

struct LevelRowsView: View {
    @ObservedObject var state: CalculatorState

    var body: some View {
        VStack(spacing: 0) {
            // Header row
            HStack(spacing: 4) {
                Text("Lv").frame(width: 36).font(.caption).foregroundStyle(Color.bwInkSoft)
                ForEach(STATS, id: \.self) { stat in
                    let label = STAT_LABELS[stat] ?? stat
                    let n = state.nature != "none" ? NATURES[state.nature] : nil
                    let isUp = n?.up == stat
                    let isDn = n?.dn == stat
                    Text(label + (isUp ? "↑" : isDn ? "↓" : ""))
                        .frame(maxWidth: .infinity)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(isUp ? Color.bwAccent : isDn ? Color.bwWarn : Color.bwInkSoft)
                }
                Spacer().frame(width: 28)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)

            Divider().background(Color.bwLine)

            ForEach(state.rows.indices, id: \.self) { idx in
                StatRowInputView(
                    row: Binding(
                        get: { state.rows[idx] },
                        set: { state.rows[idx] = $0 }
                    ),
                    showEVs: state.showEVs,
                    canDelete: state.rows.count > 1,
                    onDelete: { state.rows.remove(at: idx) }
                )
                if idx < state.rows.count - 1 {
                    Divider().background(Color.bwLine).padding(.leading, 12)
                }
            }

            Divider().background(Color.bwLine)

            Button(action: { state.addRow() }) {
                Label("Add another level", systemImage: "plus")
                    .font(.subheadline)
                    .foregroundStyle(Color.bwAccent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
            }
        }
        .background(Color.bwCard)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Single row

private struct StatRowInputView: View {
    @Binding var row: StatRow
    let showEVs: Bool
    let canDelete: Bool
    let onDelete: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Stat row
            HStack(spacing: 4) {
                TextField("", text: $row.levelStr)
                    .frame(width: 36)
                    .multilineTextAlignment(.center)
                    .keyboardType(.numberPad)
                    .font(.system(.subheadline, design: .monospaced).weight(.semibold))
                    .foregroundStyle(Color.bwAccentInk)
                    .padding(4)
                    .background(Color.bwAccentSoft)
                    .clipShape(RoundedRectangle(cornerRadius: 4))

                ForEach(STATS, id: \.self) { stat in
                    TextField("", text: Binding(
                        get: { row.statStrs[stat] ?? "" },
                        set: { row.statStrs[stat] = $0 }
                    ))
                    .frame(maxWidth: .infinity)
                    .multilineTextAlignment(.center)
                    .keyboardType(.numberPad)
                    .font(.system(.subheadline, design: .monospaced))
                    .foregroundStyle(Color.bwInk)
                    .padding(4)
                    .background(Color.bwLine)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
                }

                Button(action: onDelete) {
                    Image(systemName: "xmark")
                        .font(.caption)
                        .foregroundStyle(canDelete ? Color.bwInkFaint : Color.clear)
                }
                .frame(width: 28)
                .disabled(!canDelete)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            // EV row (shown when showEVs is on)
            if showEVs {
                HStack(spacing: 4) {
                    Text("EV")
                        .frame(width: 36)
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(Color.bwWarn)
                        .multilineTextAlignment(.center)

                    ForEach(STATS, id: \.self) { stat in
                        TextField("0", text: Binding(
                            get: { row.evStrs[stat] ?? "" },
                            set: { row.evStrs[stat] = $0 }
                        ))
                        .frame(maxWidth: .infinity)
                        .multilineTextAlignment(.center)
                        .keyboardType(.numberPad)
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundStyle(Color.bwWarn)
                        .padding(4)
                        .background(Color(hex: "1a1600"))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                    }

                    Spacer().frame(width: 28)
                }
                .padding(.horizontal, 12)
                .padding(.bottom, 8)
            }
        }
    }
}
