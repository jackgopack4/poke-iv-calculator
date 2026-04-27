import SwiftUI

// BW dark theme colors matching the web app
extension Color {
    static let bwBackground   = Color(hex: "111318")
    static let bwCard         = Color(hex: "1c1f28")
    static let bwAccent       = Color(hex: "2ec8a8")
    static let bwAccentSoft   = Color(hex: "0d2820")
    static let bwAccentInk    = Color(hex: "50e8cc")
    static let bwInk          = Color(hex: "e8ecf0")
    static let bwInkSoft      = Color(hex: "8899aa")
    static let bwInkFaint     = Color(hex: "4a5566")
    static let bwLine         = Color(hex: "262c38")
    static let bwLineStrong   = Color(hex: "333d50")
    static let bwWarn         = Color(hex: "e8a830")
    static let bwBad          = Color(hex: "e85858")
    static let bwBadSoft      = Color(hex: "280a0a")
    static let bwSpeciesBlue  = Color(hex: "1a3a50")
    static let bwSpeciesBorder = Color(hex: "4ab8e8")

    init(hex: String) {
        let v = UInt64(hex, radix: 16) ?? 0
        let r = Double((v >> 16) & 0xFF) / 255
        let g = Double((v >> 8)  & 0xFF) / 255
        let b = Double(v         & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}
