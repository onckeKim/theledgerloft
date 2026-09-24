import SwiftUI

// The Ledger Loft Co design system
enum LL {
    enum Color {
        static let navy = SwiftUI.Color(red: 0.1176, green: 0.1647, blue: 0.2196)  // #1E2A38
        static let navyDeep = SwiftUI.Color(red: 0.0784, green: 0.1176, blue: 0.1608)  // #141E29
        static let navySoft = SwiftUI.Color(red: 0.1647, green: 0.2118, blue: 0.2549)  // #2A3641
        static let cream = SwiftUI.Color(red: 0.9686, green: 0.9569, blue: 0.9333)  // #F7F4EE
        static let creamDeep = SwiftUI.Color(red: 0.9373, green: 0.9216, blue: 0.8863)  // #EFEBE2
        static let sage = SwiftUI.Color(red: 0.4863, green: 0.6157, blue: 0.5451)  // #7C9D8B
        static let sageDeep = SwiftUI.Color(red: 0.3686, green: 0.4824, blue: 0.4235)  // #5E7B6C
        static let sageText = SwiftUI.Color(red: 0.3373, green: 0.4392, blue: 0.3843)  // #567062
        static let gold = SwiftUI.Color(red: 0.8314, green: 0.6941, blue: 0.4157)  // #D4B16A
        static let goldDeep = SwiftUI.Color(red: 0.6588, green: 0.5216, blue: 0.2471)  // #A8853F
        static let goldText = SwiftUI.Color(red: 0.5059, green: 0.4000, blue: 0.1922)  // #816631
        static let ink = SwiftUI.Color(red: 0.1176, green: 0.1647, blue: 0.2196)  // #1E2A38
        static let inkMuted = SwiftUI.Color(red: 0.3608, green: 0.4157, blue: 0.4706)  // #5C6A78
        static let inkFaint = SwiftUI.Color(red: 0.5412, green: 0.5922, blue: 0.6392)  // #8A97A3
        static let line = SwiftUI.Color(red: 0.8510, green: 0.8235, blue: 0.7686)  // #D9D2C4
        static let lineStrong = SwiftUI.Color(red: 0.7255, green: 0.6902, blue: 0.6275)  // #B9B0A0
        static let lineDark = SwiftUI.Color(red: 0.1804, green: 0.2275, blue: 0.2745)  // #2E3A46
        static let success = SwiftUI.Color(red: 0.1843, green: 0.4196, blue: 0.2980)  // #2F6B4C
        static let successBg = SwiftUI.Color(red: 0.9059, green: 0.9412, blue: 0.9176)  // #E7F0EA
        static let warning = SwiftUI.Color(red: 0.6118, green: 0.4196, blue: 0.0824)  // #9C6B15
        static let warningText = SwiftUI.Color(red: 0.5569, green: 0.3804, blue: 0.0745)  // #8E6113
        static let warningBg = SwiftUI.Color(red: 0.9686, green: 0.9333, blue: 0.8627)  // #F7EEDC
        static let danger = SwiftUI.Color(red: 0.6392, green: 0.2157, blue: 0.1490)  // #A33726
        static let dangerBg = SwiftUI.Color(red: 0.9647, green: 0.8941, blue: 0.8784)  // #F6E4E0
        static let info = SwiftUI.Color(red: 0.2000, green: 0.3373, blue: 0.4353)  // #33566F
        static let infoBg = SwiftUI.Color(red: 0.8941, green: 0.9216, blue: 0.9490)  // #E4EBF2
    }
    enum Space {
        static let s0: CGFloat = 0
        static let s1: CGFloat = 4
        static let s2: CGFloat = 8
        static let s3: CGFloat = 12
        static let s4: CGFloat = 16
        static let s5: CGFloat = 24
        static let s6: CGFloat = 32
        static let s7: CGFloat = 48
        static let s8: CGFloat = 64
        static let s9: CGFloat = 96
        static let s10: CGFloat = 128
    }
    enum Radius {
        static let none: CGFloat = 0
        static let sm: CGFloat = 2
        static let md: CGFloat = 4
        static let lg: CGFloat = 8
        static let pill: CGFloat = 999
    }
    enum Font {
        static let display = "PlayfairDisplay-SemiBold"
        static let body = "Inter-Regular"
        static let label = "Inter-SemiBold"
        static let displaySize: CGFloat = 40
        static let h1Size: CGFloat = 32
        static let h2Size: CGFloat = 24
        static let h3Size: CGFloat = 19
        static let bodyLgSize: CGFloat = 17
        static let bodySize: CGFloat = 15
        static let bodySmSize: CGFloat = 13
        static let labelSize: CGFloat = 11
        static let labelSmSize: CGFloat = 10
        static let numericSize: CGFloat = 15
        static let numericLgSize: CGFloat = 34
    }
}
