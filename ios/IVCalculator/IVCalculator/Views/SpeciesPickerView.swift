import SwiftUI

struct SpeciesPickerView: View {
    let allSpecies: [PokemonSpecies]
    @Binding var selected: PokemonSpecies?
    @Environment(\.dismiss) private var dismiss

    @State private var query = ""

    private var filtered: [PokemonSpecies] {
        let q = query.trimmingCharacters(in: .whitespaces).lowercased()
        if q.isEmpty { return allSpecies }
        if q.allSatisfy(\.isNumber) {
            return allSpecies.filter { String($0.dex).hasPrefix(q) }
        }
        return allSpecies.filter { $0.name.lowercased().contains(q) }
    }

    var body: some View {
        NavigationStack {
            List(filtered) { mon in
                Button {
                    selected = mon
                    dismiss()
                } label: {
                    HStack(spacing: 12) {
                        Text(mon.dexFormatted())
                            .font(.system(.caption, design: .monospaced))
                            .foregroundStyle(Color.bwInkFaint)
                            .frame(width: 40, alignment: .leading)
                        Text(mon.name)
                            .foregroundStyle(Color.bwInk)
                        Spacer()
                        if selected?.id == mon.id {
                            Image(systemName: "checkmark")
                                .foregroundStyle(Color.bwAccent)
                        }
                    }
                }
                .listRowBackground(Color.bwCard)
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(Color.bwBackground)
            .searchable(text: $query, prompt: "Name or Dex #")
            .navigationTitle("Choose Species")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(Color.bwAccent)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
