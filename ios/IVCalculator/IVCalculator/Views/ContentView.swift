import SwiftUI

struct ContentView: View {
    @ObservedObject var state: CalculatorState
    @State private var showSpeciesPicker = false

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // ── Header ──────────────────────────────────────────
                VStack(alignment: .leading, spacing: 4) {
                    Text("GEN 5 IV CALCULATOR")
                        .font(.system(size: 22, weight: .black))
                        .tracking(1.5)
                        .foregroundStyle(Color.bwInk)
                    Text("BLACK · WHITE · B2W2  ·  OFFLINE")
                        .font(.system(size: 10, weight: .semibold))
                        .tracking(1.0)
                        .foregroundStyle(Color.bwInkSoft)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 16)
                .padding(.top, 20)
                .padding(.bottom, 16)

                // ── Species ─────────────────────────────────────────
                SectionCard(title: "Species") {
                    if let mon = state.species {
                        HStack {
                            Text(mon.dexFormatted())
                                .font(.system(.caption, design: .monospaced))
                                .foregroundStyle(Color.bwSpeciesBorder.opacity(0.8))
                            Text(mon.name)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Color(hex: "e8f8ff"))
                            Spacer()
                            Button {
                                state.resetAll()
                            } label: {
                                Text("×")
                                    .font(.title2)
                                    .foregroundStyle(Color.bwSpeciesBorder)
                            }
                        }
                        .padding(10)
                        .background(Color.bwSpeciesBlue)
                        .overlay(RoundedRectangle(cornerRadius: 4)
                            .stroke(Color.bwSpeciesBorder, lineWidth: 1))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                    } else {
                        Button {
                            showSpeciesPicker = true
                        } label: {
                            HStack {
                                Image(systemName: "magnifyingglass")
                                Text("Search by name or Dex #…")
                                Spacer()
                            }
                            .foregroundStyle(Color.bwInkSoft)
                            .padding(12)
                            .background(Color.bwLine)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                        .buttonStyle(.plain)
                    }
                }

                // ── Modifiers ───────────────────────────────────────
                SectionCard(title: "Modifiers") {
                    VStack(spacing: 10) {
                        // Nature
                        PickerRow(label: "Nature") {
                            Picker("Nature", selection: $state.nature) {
                                Text("— Unknown —").tag("none")
                                ForEach(NATURE_NAMES.filter { $0 != "none" }, id: \.self) { n in
                                    Text(n.capitalized).tag(n)
                                }
                            }
                        }

                        Divider().background(Color.bwLine)

                        // Characteristic
                        PickerRow(label: "Characteristic") {
                            Picker("Characteristic", selection: $state.characteristic) {
                                Text("— Ignore —").tag("none")
                                ForEach(CHARACTERISTICS) { c in
                                    Text(c.label).tag(c.id)
                                }
                            }
                        }

                        Divider().background(Color.bwLine)

                        // Hidden Power
                        PickerRow(label: "Hidden Power") {
                            Picker("Hidden Power", selection: $state.hiddenPower) {
                                Text("— Unknown —").tag("none")
                                ForEach(HP_TYPES, id: \.self) { t in
                                    Text(t).tag(t.lowercased())
                                }
                            }
                        }

                        Divider().background(Color.bwLine)

                        // EV toggle
                        HStack {
                            Text("Show EV columns")
                                .font(.subheadline)
                                .foregroundStyle(Color.bwInk)
                            Spacer()
                            Toggle("", isOn: $state.showEVs)
                                .tint(Color.bwAccent)
                                .labelsHidden()
                        }
                    }
                }

                // ── Stats ───────────────────────────────────────────
                SectionCard(title: "Stats at each level") {
                    LevelRowsView(state: state)
                }

                // ── Results ─────────────────────────────────────────
                SectionCard(title: "IV Results") {
                    HStack {
                        Spacer()
                        Button("Reset ↺") { state.resetModifiers() }
                            .font(.caption)
                            .foregroundStyle(Color.bwInkSoft)
                    }
                    ResultsView(results: state.results)
                }

                Spacer(minLength: 60)
            }
        }
        .background(Color.bwBackground)
        .sheet(isPresented: $showSpeciesPicker) {
            SpeciesPickerView(allSpecies: state.allSpecies, selected: $state.species)
        }
        .preferredColorScheme(.dark)
    }
}

// MARK: - Reusable layout helpers

struct SectionCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title.uppercased())
                .font(.system(size: 11, weight: .bold))
                .tracking(2.0)
                .foregroundStyle(Color.bwAccent)

            content()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.bwCard)
        .overlay(alignment: .top) {
            Rectangle().fill(Color.bwAccent).frame(height: 2)
        }
        .clipShape(RoundedRectangle(cornerRadius: 4))
        .padding(.horizontal, 12)
        .padding(.bottom, 12)
    }
}

private struct PickerRow<Content: View>: View {
    let label: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundStyle(Color.bwInk)
            Spacer()
            content()
                .labelsHidden()
                .tint(Color.bwAccent)
        }
    }
}
