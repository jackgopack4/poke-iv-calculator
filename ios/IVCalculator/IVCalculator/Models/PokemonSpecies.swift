import Foundation

struct PokemonSpecies: Codable, Identifiable, Hashable {
    let id: String    // JSON key, e.g. "charizard"
    let name: String
    let dex: Int
    let hp, atk, def, spa, spd, spe: Int

    func base(for stat: String) -> Int {
        switch stat {
        case "hp":  return hp
        case "atk": return atk
        case "def": return def
        case "spa": return spa
        case "spd": return spd
        case "spe": return spe
        default:    return 0
        }
    }

    func dexFormatted() -> String {
        String(format: "#%03d", dex)
    }
}
