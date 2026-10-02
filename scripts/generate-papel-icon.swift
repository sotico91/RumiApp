import AppKit
import Foundation
import UniformTypeIdentifiers

let cream = NSColor(srgbRed: 243 / 255, green: 230 / 255, blue: 216 / 255, alpha: 1)
let navy = NSColor(srgbRed: 27 / 255, green: 58 / 255, blue: 75 / 255, alpha: 1)
let coral = NSColor(srgbRed: 255 / 255, green: 107 / 255, blue: 74 / 255, alpha: 1)

enum MarkKind {
  case color
  case white
}

func drawCruce(
  ctx: CGContext,
  size: CGFloat,
  background: NSColor?,
  markScale: CGFloat,
  kind: MarkKind
) {
  ctx.saveGState()
  ctx.translateBy(x: 0, y: size)
  ctx.scaleBy(x: size / 100, y: -size / 100)

  if let background {
    ctx.setFillColor(background.cgColor)
    ctx.fill(CGRect(x: 0, y: 0, width: 100, height: 100))
  }

  if markScale <= 0 {
    ctx.restoreGState()
    return
  }

  ctx.translateBy(x: 50, y: 50)
  ctx.scaleBy(x: markScale, y: markScale)
  ctx.translateBy(x: -50, y: -50)

  let back = CGPath(
    roundedRect: CGRect(x: 15, y: 37, width: 70, height: 24),
    cornerWidth: 7,
    cornerHeight: 7,
    transform: nil
  )
  let front = CGPath(
    roundedRect: CGRect(x: 15, y: 39, width: 70, height: 24),
    cornerWidth: 7,
    cornerHeight: 7,
    transform: nil
  )

  ctx.saveGState()
  ctx.translateBy(x: 50, y: 50)
  ctx.rotate(by: -26 * .pi / 180)
  ctx.translateBy(x: -50, y: -50)
  ctx.addPath(back)
  ctx.setFillColor(kind == .color ? navy.cgColor : NSColor.white.cgColor)
  ctx.fillPath()
  ctx.restoreGState()

  ctx.saveGState()
  ctx.translateBy(x: 50, y: 50)
  ctx.rotate(by: 24 * .pi / 180)
  ctx.translateBy(x: -50, y: -50)

  if kind == .white {
    ctx.addPath(front)
    ctx.setBlendMode(.clear)
    ctx.setStrokeColor(NSColor.white.cgColor)
    ctx.setLineWidth(3.2)
    ctx.strokePath()
    ctx.setBlendMode(.normal)
    ctx.addPath(front)
    ctx.setFillColor(NSColor.white.cgColor)
    ctx.fillPath()
  } else {
    ctx.addPath(front)
    ctx.setStrokeColor(cream.cgColor)
    ctx.setLineWidth(3)
    ctx.setFillColor(coral.cgColor)
    ctx.drawPath(using: .fillStroke)
  }
  ctx.restoreGState()
  ctx.restoreGState()
}

func writePNG(size: Int, path: String, opaque: Bool, background: NSColor?, markScale: CGFloat, kind: MarkKind) {
  let px = CGFloat(size)
  let colorSpace = CGColorSpaceCreateDeviceRGB()
  let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue)
  guard let ctx = CGContext(
    data: nil,
    width: size,
    height: size,
    bitsPerComponent: 8,
    bytesPerRow: 0,
    space: colorSpace,
    bitmapInfo: bitmapInfo.rawValue
  ) else {
    fputs("Could not create context for \(path)\n", stderr)
    exit(1)
  }
  ctx.setAllowsAntialiasing(true)
  ctx.setShouldAntialias(true)
  ctx.interpolationQuality = .high
  if opaque, let background {
    ctx.setFillColor(background.cgColor)
    ctx.fill(CGRect(x: 0, y: 0, width: px, height: px))
  } else {
    ctx.clear(CGRect(x: 0, y: 0, width: px, height: px))
  }
  drawCruce(ctx: ctx, size: px, background: opaque ? background : nil, markScale: markScale, kind: kind)
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

writePNG(size: 1024, path: "\(root)/assets/images/icon.png", opaque: true, background: cream, markScale: 1, kind: .color)
writePNG(size: 1024, path: "\(root)/assets/images/splash-icon.png", opaque: false, background: nil, markScale: 1.05, kind: .color)
writePNG(size: 1024, path: "\(root)/assets/images/android-icon-foreground.png", opaque: false, background: nil, markScale: 0.62, kind: .color)
writePNG(size: 512, path: "\(root)/assets/images/android-icon-background.png", opaque: true, background: cream, markScale: 0, kind: .color)
writePNG(size: 432, path: "\(root)/assets/images/android-icon-monochrome.png", opaque: false, background: nil, markScale: 0.62, kind: .white)
writePNG(size: 1024, path: "\(root)/assets/images/notification-icon.png", opaque: false, background: nil, markScale: 0.9, kind: .white)
writePNG(size: 48, path: "\(root)/assets/images/favicon.png", opaque: true, background: cream, markScale: 1, kind: .color)
writePNG(
  size: 1024,
  path: "\(root)/ios/Rumi/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png",
  opaque: true,
  background: cream,
  markScale: 1,
  kind: .color
)
writePNG(
  size: 1024,
  path: "\(root)/ios/Rumi/Images.xcassets/AppIcon.appiconset/App-Icon-dark-1024x1024@1x.png",
  opaque: true,
  background: cream,
  markScale: 1,
  kind: .color
)
writePNG(
  size: 72,
  path: "\(root)/ios/Rumi/Images.xcassets/SplashScreenLogo.imageset/image.png",
  opaque: false,
  background: nil,
  markScale: 1.05,
  kind: .color
)
writePNG(
  size: 144,
  path: "\(root)/ios/Rumi/Images.xcassets/SplashScreenLogo.imageset/image@2x.png",
  opaque: false,
  background: nil,
  markScale: 1.05,
  kind: .color
)
writePNG(
  size: 216,
  path: "\(root)/ios/Rumi/Images.xcassets/SplashScreenLogo.imageset/image@3x.png",
  opaque: false,
  background: nil,
  markScale: 1.05,
  kind: .color
)
