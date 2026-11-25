import AppKit
import CoreText
import Foundation
import UniformTypeIdentifiers

// Rumi mark: two bills fanned out (petrol behind, coral in front). The coral
// bill's seal carries a mark the way a banknote carries a portrait. The app
// icon keeps it sober; the launch animation (BootSplash) draws Rumi's face on
// the seal. Geometry lives in a 100×100 box, y pointing down.

enum SealMark {
  case face
  case ring
  case monogram
}

/// What the icons show on the seal.
var iconSeal: SealMark = .monogram
/// December edition: Santa hat over the bills, holly on the coral bill, snow behind.
/// RUMI_ICON_XMAS=1 turns it on for a run.
let christmas = ProcessInfo.processInfo.environment["RUMI_ICON_XMAS"] == "1"

let root = FileManager.default.currentDirectoryPath
let monogramFont: CTFont = {
  let url = URL(fileURLWithPath: "\(root)/node_modules/@expo-google-fonts/fraunces/700Bold/Fraunces_700Bold.ttf")
  guard
    let descriptors = CTFontManagerCreateFontDescriptorsFromURL(url as CFURL) as? [CTFontDescriptor],
    let first = descriptors.first
  else {
    fputs("Fraunces not found; run npm install first\n", stderr)
    exit(1)
  }
  return CTFontCreateWithFontDescriptor(first, 11, nil)
}()

func rgb(_ hex: UInt32, _ alpha: CGFloat = 1) -> CGColor {
  CGColor(
    srgbRed: CGFloat((hex >> 16) & 0xFF) / 255,
    green: CGFloat((hex >> 8) & 0xFF) / 255,
    blue: CGFloat(hex & 0xFF) / 255,
    alpha: alpha
  )
}

struct Palette {
  let background: CGColor
  let back: CGColor
  let backLine: CGColor
  let front: CGColor
  let frontLine: CGColor
  /// Gap drawn around the front bill so the two bills separate.
  let outline: CGColor
  let seal: CGColor
  let face: CGColor
}

let cream = rgb(0xF3E6D8)
let paper = rgb(0xFFFDF8)

let light = Palette(
  background: cream,
  back: rgb(0x1D3A4C),
  backLine: rgb(0xF3E6D8, 0.28),
  front: rgb(0xFF6B4A),
  frontLine: rgb(0xFFFDF8, 0.6),
  outline: cream,
  seal: paper,
  face: rgb(0x1D3A4C)
)
let dark = Palette(
  background: rgb(0x0F2A36),
  back: rgb(0x2C5C72),
  backLine: rgb(0xF3E6D8, 0.25),
  front: rgb(0xFF6B4A),
  frontLine: rgb(0xFFFDF8, 0.6),
  outline: rgb(0x0F2A36),
  seal: paper,
  face: rgb(0x1D3A4C)
)
/// iOS tinted icons are grayscale; the system adds the tint.
let tinted = Palette(
  background: rgb(0x000000),
  back: rgb(0x5E5E5E),
  backLine: rgb(0xFFFFFF, 0.2),
  front: rgb(0xD9D9D9),
  frontLine: rgb(0xFFFFFF, 0.6),
  outline: rgb(0x000000),
  seal: rgb(0xFFFFFF),
  face: rgb(0x000000)
)

enum Style {
  case color(Palette)
  /// Single-color silhouette (Android themed icon, notification icon): white,
  /// with the gaps, lines and face punched out.
  case silhouette
}

let billW: CGFloat = 58.6
let billH: CGFloat = 25.6
let billR: CGFloat = 5.27
let lineInset: CGFloat = 2.54
let lineWidth: CGFloat = 0.78
let backCenter = CGPoint(x: 45.9, y: 43.9)
let backAngle: CGFloat = -14
let frontCenter = CGPoint(x: 53.5, y: 56.15)
let frontAngle: CGFloat = 9
let outlineWidth: CGFloat = 1.56
let sealRadius: CGFloat = 7.62
let ringRadius: CGFloat = 6.05
/// Centre of the drawn mark, so scaling keeps it centred in the canvas.
let markCenter = CGPoint(x: 50.4, y: 49.6)

func billRect(inset: CGFloat = 0) -> CGRect {
  CGRect(x: -billW / 2 + inset, y: -billH / 2 + inset, width: billW - inset * 2, height: billH - inset * 2)
}

func withBill(_ ctx: CGContext, center: CGPoint, angle: CGFloat, _ body: () -> Void) {
  ctx.saveGState()
  ctx.translateBy(x: center.x, y: center.y)
  ctx.rotate(by: angle * .pi / 180)
  body()
  ctx.restoreGState()
}

func fillRounded(_ ctx: CGContext, _ rect: CGRect, _ radius: CGFloat, _ color: CGColor) {
  ctx.addPath(CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil))
  ctx.setFillColor(color)
  ctx.fillPath()
}

func strokeRounded(_ ctx: CGContext, _ rect: CGRect, _ radius: CGFloat, _ color: CGColor, _ width: CGFloat) {
  ctx.addPath(CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil))
  ctx.setStrokeColor(color)
  ctx.setLineWidth(width)
  ctx.strokePath()
}

/// "R" in Fraunces, upright and optically centred on the origin.
func drawMonogram(_ ctx: CGContext, _ color: CGColor) {
  let attrs: [NSAttributedString.Key: Any] = [
    NSAttributedString.Key(kCTFontAttributeName as String): monogramFont,
    NSAttributedString.Key(kCTForegroundColorAttributeName as String): color,
  ]
  let line = CTLineCreateWithAttributedString(NSAttributedString(string: "R", attributes: attrs))
  let bounds = CTLineGetBoundsWithOptions(line, .useGlyphPathBounds)
  ctx.saveGState()
  // The canvas is y-down; text wants y-up.
  ctx.scaleBy(x: 1, y: -1)
  ctx.textPosition = CGPoint(x: -bounds.midX, y: -bounds.midY)
  CTLineDraw(line, ctx)
  ctx.restoreGState()
}

/// Eyes and smile, upright, around the origin (the seal centre).
func drawFace(_ ctx: CGContext, _ color: CGColor) {
  ctx.setFillColor(color)
  ctx.fillEllipse(in: CGRect(x: -2.64 - 1.17, y: -1.37 - 1.17, width: 2.34, height: 2.34))
  ctx.fillEllipse(in: CGRect(x: 2.64 - 1.17, y: -1.37 - 1.17, width: 2.34, height: 2.34))
  ctx.move(to: CGPoint(x: -3.52, y: 1.56))
  ctx.addQuadCurve(to: CGPoint(x: 3.52, y: 1.56), control: CGPoint(x: 0, y: 5.08))
  ctx.setStrokeColor(color)
  ctx.setLineWidth(1.17)
  ctx.setLineCap(.round)
  ctx.strokePath()
}

/// Where the brim's centre sits, in the front bill's coordinates (rotated with
/// it), plus tilt and size. RUMI_HAT="x,y,angle,scale" overrides it.
let hatPlace: (x: CGFloat, y: CGFloat, angle: CGFloat, scale: CGFloat) = {
  if let raw = ProcessInfo.processInfo.environment["RUMI_HAT"] {
    let v = raw.split(separator: ",").compactMap { Double($0) }.map { CGFloat($0) }
    if v.count == 4 { return (v[0], v[1], v[2], v[3]) }
  }
  // Over the top-left corner of both bills, tilted the other way.
  return (-24, -11, -28, 1.45)
}()

/// Holly sits in the bill's bottom-right corner (the hat takes the top-left);
/// RUMI_HOLLY=tl moves it to the top-left.
let hollyBottomRight = ProcessInfo.processInfo.environment["RUMI_HOLLY"] != "tl"

let hatRed = rgb(0xD62839)
let hatShade = rgb(0xA81D2C)
let holly = rgb(0x2E7D4F)
let hollyDark = rgb(0x1F5E3A)

/// Santa hat sitting on the seal, upright around the seal centre. The tip
/// flops over to the right and its pompom hangs past the seal.
func drawHat(_ ctx: CGContext, silhouette: Bool) {
  let white = rgb(0xFFFFFF)
  let clear = rgb(0xFFFFFF)
  ctx.saveGState()
  ctx.rotate(by: -12 * .pi / 180)
  // Cone.
  let cone = CGMutablePath()
  cone.move(to: CGPoint(x: -7.4, y: -5.6))
  cone.addCurve(to: CGPoint(x: 2.2, y: -18.6), control1: CGPoint(x: -6.6, y: -12.4), control2: CGPoint(x: -2.6, y: -18.2))
  cone.addCurve(to: CGPoint(x: 10.6, y: -11.4), control1: CGPoint(x: 6.4, y: -19.0), control2: CGPoint(x: 9.6, y: -15.2))
  cone.addCurve(to: CGPoint(x: 7.2, y: -5.6), control1: CGPoint(x: 9.0, y: -12.6), control2: CGPoint(x: 7.0, y: -9.0))
  cone.closeSubpath()
  ctx.addPath(cone)
  ctx.setFillColor(silhouette ? white : hatRed)
  ctx.fillPath()
  if !silhouette {
    // Fold shadow so the tip reads as flopping over.
    let fold = CGMutablePath()
    fold.move(to: CGPoint(x: 2.2, y: -18.6))
    fold.addCurve(to: CGPoint(x: 10.6, y: -11.4), control1: CGPoint(x: 6.4, y: -19.0), control2: CGPoint(x: 9.6, y: -15.2))
    fold.addCurve(to: CGPoint(x: 3.4, y: -15.4), control1: CGPoint(x: 8.2, y: -14.2), control2: CGPoint(x: 5.6, y: -15.6))
    fold.closeSubpath()
    ctx.addPath(fold)
    ctx.setFillColor(hatShade)
    ctx.fillPath()
  }
  // Fur brim.
  let brim = CGRect(x: -8.6, y: -7.8, width: 17.2, height: 4.0)
  if silhouette {
    ctx.setBlendMode(.clear)
    ctx.addPath(CGPath(roundedRect: brim.insetBy(dx: -0.7, dy: -0.7), cornerWidth: 2.6, cornerHeight: 2.6, transform: nil))
    ctx.setFillColor(clear)
    ctx.fillPath()
    ctx.setBlendMode(.normal)
  }
  ctx.addPath(CGPath(roundedRect: brim, cornerWidth: 2.0, cornerHeight: 2.0, transform: nil))
  ctx.setFillColor(white)
  ctx.fillPath()
  // Pompom.
  ctx.setFillColor(white)
  ctx.fillEllipse(in: CGRect(x: 10.6 - 2.3, y: -11.4 - 2.3, width: 4.6, height: 4.6))
  ctx.restoreGState()
}

/// Holly sprig: two leaves and three berries, around the origin.
func drawHolly(_ ctx: CGContext, silhouette: Bool) {
  let white = rgb(0xFFFFFF)
  func leaf(_ angle: CGFloat) {
    ctx.saveGState()
    ctx.rotate(by: angle * .pi / 180)
    let path = CGMutablePath()
    path.move(to: .zero)
    path.addCurve(to: CGPoint(x: 9.0, y: 0), control1: CGPoint(x: 2.5, y: -3.6), control2: CGPoint(x: 6.5, y: -3.6))
    path.addCurve(to: .zero, control1: CGPoint(x: 6.5, y: 3.6), control2: CGPoint(x: 2.5, y: 3.6))
    ctx.addPath(path)
    ctx.setFillColor(silhouette ? white : holly)
    ctx.fillPath()
    if !silhouette {
      ctx.move(to: CGPoint(x: 0.8, y: 0))
      ctx.addLine(to: CGPoint(x: 7.6, y: 0))
      ctx.setStrokeColor(hollyDark)
      ctx.setLineWidth(0.5)
      ctx.strokePath()
    }
    ctx.restoreGState()
  }
  leaf(-160)
  leaf(-110)
  for (x, y) in [(-0.4, 1.4), (1.9, 0.3), (1.4, 2.8)] as [(CGFloat, CGFloat)] {
    ctx.setFillColor(silhouette ? white : hatRed)
    ctx.fillEllipse(in: CGRect(x: x - 1.4, y: y - 1.4, width: 2.8, height: 2.8))
  }
}

/// Soft snow dots on the background, fixed so every render matches.
func drawSnow(_ ctx: CGContext, dark: Bool) {
  let dots: [(CGFloat, CGFloat, CGFloat)] = [
    (12, 14, 1.4), (27, 8, 0.9), (44, 15, 1.1), (63, 9, 1.5), (82, 16, 1.0), (91, 6, 0.8),
    (7, 33, 0.9), (93, 34, 1.3), (14, 70, 1.2), (6, 86, 0.8), (88, 74, 0.9), (95, 90, 1.3),
    (28, 88, 1.0), (47, 93, 1.4), (69, 87, 0.9), (79, 26, 0.7), (20, 24, 0.7), (36, 80, 0.7),
  ]
  ctx.setFillColor(dark ? rgb(0xFFFFFF, 0.55) : rgb(0xFFFFFF, 0.95))
  for (x, y, r) in dots {
    ctx.fillEllipse(in: CGRect(x: x - r, y: y - r, width: r * 2, height: r * 2))
  }
}

/// `sealOnly` draws just the seal's mark (no bills), for layers BootSplash fades.
func drawMark(_ ctx: CGContext, style: Style, seal sealMark: SealMark?, sealOnly: Bool = false) {
  let clear = rgb(0xFFFFFF)
  let white = rgb(0xFFFFFF)
  let silhouette: Bool
  let p: Palette
  switch style {
  case .color(let palette):
    p = palette
    silhouette = false
  case .silhouette:
    p = light
    silhouette = true
  }

  // Punches a shape out of the silhouette, or paints it in color.
  func paint(_ color: CGColor, punch: Bool, _ draw: () -> Void) {
    if silhouette && punch {
      ctx.setBlendMode(.clear)
      draw()
      ctx.setBlendMode(.normal)
    } else {
      draw()
    }
  }

  if !sealOnly {
  withBill(ctx, center: backCenter, angle: backAngle) {
    fillRounded(ctx, billRect(), billR, silhouette ? rgb(0xFFFFFF, 0.55) : p.back)
    paint(silhouette ? clear : p.backLine, punch: true) {
      strokeRounded(ctx, billRect(inset: lineInset), 3.125, silhouette ? clear : p.backLine, lineWidth)
    }
    let ring = CGRect(x: -ringRadius, y: -ringRadius, width: ringRadius * 2, height: ringRadius * 2)
    paint(silhouette ? clear : p.backLine, punch: true) {
      ctx.setStrokeColor(silhouette ? clear : p.backLine)
      ctx.setLineWidth(1.17)
      ctx.strokeEllipse(in: ring)
    }
  }

  }

  withBill(ctx, center: frontCenter, angle: frontAngle) {
    if !sealOnly {
    let outer = billRect(inset: -outlineWidth)
    paint(p.outline, punch: true) {
      fillRounded(ctx, outer, 6.84, silhouette ? clear : p.outline)
    }
    fillRounded(ctx, billRect(), billR, silhouette ? white : p.front)
    paint(p.frontLine, punch: true) {
      strokeRounded(ctx, billRect(inset: lineInset), 3.125, silhouette ? clear : p.frontLine, lineWidth)
    }
    let seal = CGRect(x: -sealRadius, y: -sealRadius, width: sealRadius * 2, height: sealRadius * 2)
    if silhouette {
      // A ring keeps the seal readable once everything is one color.
      ctx.setBlendMode(.clear)
      ctx.setStrokeColor(clear)
      ctx.setLineWidth(0.9)
      ctx.strokeEllipse(in: seal.insetBy(dx: 0.45, dy: 0.45))
      ctx.setBlendMode(.normal)
    } else {
      ctx.setFillColor(p.seal)
      ctx.fillEllipse(in: seal)
    }
    }
    if let sealMark {
      ctx.saveGState()
      ctx.rotate(by: -frontAngle * .pi / 180)
      let ink = silhouette ? clear : p.face
      paint(p.face, punch: true) {
        switch sealMark {
        case .face:
          drawFace(ctx, ink)
        case .monogram:
          drawMonogram(ctx, ink)
        case .ring:
          ctx.setStrokeColor(ink)
          ctx.setLineWidth(1.0)
          ctx.strokeEllipse(in: CGRect(x: -4.6, y: -4.6, width: 9.2, height: 9.2))
        }
      }
      ctx.restoreGState()
    }
    if christmas && !sealOnly {
      // Holly tucked in the bill's top-left corner, hat on the seal.
      ctx.saveGState()
      if hollyBottomRight {
        ctx.translateBy(x: billW / 2 - 5.2, y: billH / 2 - 4.6)
        ctx.rotate(by: .pi)
      } else {
        ctx.translateBy(x: -billW / 2 + 5.2, y: -billH / 2 + 4.6)
      }
      drawHolly(ctx, silhouette: silhouette)
      ctx.restoreGState()
      ctx.saveGState()
      ctx.translateBy(x: hatPlace.x, y: hatPlace.y)
      ctx.rotate(by: hatPlace.angle * .pi / 180)
      ctx.scaleBy(x: hatPlace.scale, y: hatPlace.scale)
      // drawHat is built around a seal centre; its brim sits 5.8 above it.
      ctx.translateBy(x: 0, y: 5.8)
      drawHat(ctx, silhouette: silhouette)
      ctx.restoreGState()
    }
  }
}

func writePNG(
  size: Int,
  path: String,
  style: Style,
  background: Bool,
  markScale: CGFloat,
  seal: SealMark? = iconSeal,
  sealOnly: Bool = false
) {
  let px = CGFloat(size)
  guard let ctx = CGContext(
    data: nil,
    width: size,
    height: size,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
  ) else {
    fputs("Could not create context for \(path)\n", stderr)
    exit(1)
  }
  ctx.setAllowsAntialiasing(true)
  ctx.setShouldAntialias(true)
  ctx.clear(CGRect(x: 0, y: 0, width: px, height: px))

  ctx.translateBy(x: 0, y: px)
  ctx.scaleBy(x: px / 100, y: -px / 100)
  if background, case .color(let p) = style {
    ctx.setFillColor(p.background)
    ctx.fill(CGRect(x: 0, y: 0, width: 100, height: 100))
    if christmas {
      // Background colour tells light from dark. Android draws it on its own layer too.
      drawSnow(ctx, dark: p.background != cream)
    }
  }
  if markScale > 0 {
    // Transparent layers draw the mark on its own layer so punched-out parts
    // never cut into a background.
    ctx.beginTransparencyLayer(auxiliaryInfo: nil)
    ctx.translateBy(x: 50, y: 50)
    ctx.scaleBy(x: markScale, y: markScale)
    ctx.translateBy(x: -markCenter.x, y: -markCenter.y)
    drawMark(ctx, style: style, seal: seal, sealOnly: sealOnly)
    ctx.endTransparencyLayer()
  }

  guard let image = ctx.makeImage() else {
    fputs("Could not make image for \(path)\n", stderr)
    exit(1)
  }
  let url = URL(fileURLWithPath: path)
  try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else {
    fputs("Could not write \(path)\n", stderr)
    exit(1)
  }
  CGImageDestinationAddImage(dest, image, nil)
  if !CGImageDestinationFinalize(dest) {
    fputs("Finalize failed \(path)\n", stderr)
    exit(1)
  }
  print("wrote \(path)")
}

// Run from the repo root: swift scripts/generate-papel-icon.swift
// RUMI_ICON_PREVIEW=<dir> only writes one icon per seal mark there, to compare.
if let previewDir = ProcessInfo.processInfo.environment["RUMI_ICON_PREVIEW"], christmas {
  writePNG(size: 1024, path: "\(previewDir)/xmas.png", style: .color(light), background: true, markScale: 1)
  writePNG(size: 1024, path: "\(previewDir)/xmas-dark.png", style: .color(dark), background: true, markScale: 1)
  writePNG(size: 432, path: "\(previewDir)/xmas-mono.png", style: .silhouette, background: false, markScale: 0.74)
  exit(0)
}
if let previewDir = ProcessInfo.processInfo.environment["RUMI_ICON_PREVIEW"] {
  for (name, mark) in [("face", SealMark.face), ("ring", .ring), ("monogram", .monogram)] {
    writePNG(size: 1024, path: "\(previewDir)/seal-\(name).png", style: .color(light), background: true, markScale: 1, seal: mark)
    writePNG(size: 1024, path: "\(previewDir)/seal-\(name)-dark.png", style: .color(dark), background: true, markScale: 1, seal: mark)
  }
  exit(0)
}

let images = "\(root)/assets/images"
let iosIcons = "\(root)/ios/Rumi/Images.xcassets/AppIcon.appiconset"
let iosSplash = "\(root)/ios/Rumi/Images.xcassets/SplashScreenLogo.imageset"

writePNG(size: 1024, path: "\(images)/icon.png", style: .color(light), background: true, markScale: 1)
writePNG(size: 1024, path: "\(images)/icon-dark.png", style: .color(dark), background: true, markScale: 1)
writePNG(size: 1024, path: "\(images)/icon-tinted.png", style: .color(tinted), background: true, markScale: 1)
// Native splash shows the icon's seal. BootSplash then draws a blank bill with
// the monogram on its own layer, fades the monogram out and Rumi's face in.
writePNG(size: 1024, path: "\(images)/splash-icon.png", style: .color(light), background: false, markScale: 1.25)
writePNG(size: 1024, path: "\(images)/splash-blank.png", style: .color(light), background: false, markScale: 1.25, seal: nil)
writePNG(
  size: 1024,
  path: "\(images)/splash-monogram.png",
  style: .color(light),
  background: false,
  markScale: 1.25,
  sealOnly: true
)
// Android adaptive icons crop to a circle of ~61% of the canvas.
writePNG(size: 1024, path: "\(images)/android-icon-foreground.png", style: .color(light), background: false, markScale: 0.74)
writePNG(size: 512, path: "\(images)/android-icon-background.png", style: .color(light), background: true, markScale: 0)
writePNG(size: 432, path: "\(images)/android-icon-monochrome.png", style: .silhouette, background: false, markScale: 0.74)
writePNG(size: 1024, path: "\(images)/notification-icon.png", style: .silhouette, background: false, markScale: 1.25)
writePNG(size: 48, path: "\(images)/favicon.png", style: .color(light), background: true, markScale: 1.15)

writePNG(size: 1024, path: "\(iosIcons)/App-Icon-1024x1024@1x.png", style: .color(light), background: true, markScale: 1)
writePNG(size: 1024, path: "\(iosIcons)/App-Icon-dark-1024x1024@1x.png", style: .color(dark), background: true, markScale: 1)
writePNG(size: 1024, path: "\(iosIcons)/App-Icon-tinted-1024x1024@1x.png", style: .color(tinted), background: true, markScale: 1)
for (scale, suffix) in [(1, ""), (2, "@2x"), (3, "@3x")] {
  writePNG(
    size: 72 * scale,
    path: "\(iosSplash)/image\(suffix).png",
    style: .color(light),
    background: false,
    markScale: 1.25
  )
}
