import SwiftUI

@main
struct IVCalculatorApp: App {
    @StateObject private var state = CalculatorState(allSpecies: PokemonDataLoader.load())

    var body: some Scene {
        WindowGroup {
            ContentView(state: state)
        }
    }
}
