import Foundation

enum PokemonDataLoader {
    static func load() -> [PokemonSpecies] {
        guard let url = Bundle.main.url(forResource: "pokemon-data", withExtension: "json"),
              let data = try? Data(contentsOf: url)
        else {
            assertionFailure("pokemon-data.json not found in bundle")
            return []
        }

        // JSON is a dictionary keyed by species id; decode manually to inject the key as `id`
        guard let raw = try? JSONSerialization.jsonObject(with: data) as? [String: [String: Any]]
        else {
            assertionFailure("Failed to parse pokemon-data.json")
            return []
        }

        var list = [PokemonSpecies]()
        for (key, val) in raw {
            guard let name = val["name"] as? String,
                  let dex  = val["dex"]  as? Int,
                  let hp   = val["hp"]   as? Int,
                  let atk  = val["atk"]  as? Int,
                  let def  = val["def"]  as? Int,
                  let spa  = val["spa"]  as? Int,
                  let spd  = val["spd"]  as? Int,
                  let spe  = val["spe"]  as? Int
            else { continue }
            list.append(PokemonSpecies(id: key, name: name, dex: dex,
                                       hp: hp, atk: atk, def: def,
                                       spa: spa, spd: spd, spe: spe))
        }
        return list.sorted { $0.dex < $1.dex }
    }
}
