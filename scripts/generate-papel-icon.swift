import AppKit
import Foundation
import UniformTypeIdentifiers

// Rumi mark: two bills fanned out (petrol behind, coral in front). The coral
// bill's seal carries Rumi's face, the way a banknote carries a portrait.
// Geometry lives in a 100×100 box, y pointing down.

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

func drawMark(_ ctx: CGContext, style: Style, face: Bool) {
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

  withBill(ctx, center: frontCenter, angle: frontAngle) {
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
    if face {
      ctx.saveGState()
      ctx.rotate(by: -frontAngle * .pi / 180)
      paint(p.face, punch: true) { drawFace(ctx, silhouette ? clear : p.face) }
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
  face: Bool = true
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
  }
  if markScale > 0 {
    // Transparent layers draw the mark on its own layer so punched-out parts
    // never cut into a background.
    ctx.beginTransparencyLayer(auxiliaryInfo: nil)
    ctx.translateBy(x: 50, y: 50)
    ctx.scaleBy(x: markScale, y: markScale)
    ctx.translateBy(x: -markCenter.x, y: -markCenter.y)
    drawMark(ctx, style: style, face: face)
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
let root = FileManager.default.currentDirectoryPath
let images = "\(root)/assets/images"
let iosIcons = "\(root)/ios/Rumi/Images.xcassets/AppIcon.appiconset"
let iosSplash = "\(root)/ios/Rumi/Images.xcassets/SplashScreenLogo.imageset"

writePNG(size: 1024, path: "\(images)/icon.png", style: .color(light), background: true, markScale: 1)
writePNG(size: 1024, path: "\(images)/icon-dark.png", style: .color(dark), background: true, markScale: 1)
writePNG(size: 1024, path: "\(images)/icon-tinted.png", style: .color(tinted), background: true, markScale: 1)
// The splash animates the face in (BootSplash), so its bill starts blank.
writePNG(size: 1024, path: "\(images)/splash-icon.png", style: .color(light), background: false, markScale: 1.25, face: false)
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
    markScale: 1.25,
    face: false
  )
}
