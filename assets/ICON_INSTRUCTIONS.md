# Icon Instructions

To add a custom icon for your IntraView application:

## Required Files

Place the following files in this `assets/` folder:

### For Windows
- **`icon.ico`** - Windows icon file (256x256 recommended, must include 16x16, 32x32, 48x48, 256x256 sizes)

### For macOS
- **`icon.icns`** - macOS icon file

## How to Create Icons

### Option 1: Online Converters
1. Create a 1024x1024 PNG image (your logo)
2. Use one of these free online tools:
   - [ConvertICO](https://convertico.com/) - PNG to ICO
   - [CloudConvert](https://cloudconvert.com/png-to-ico) - PNG to ICO
   - [ICO Convert](https://icoconvert.com/) - Create multi-size ICO

### Option 2: Using ImageMagick (Command Line)
```bash
# Install ImageMagick first, then:
magick convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 icon.ico
```

### Option 3: Using GIMP
1. Open your PNG in GIMP
2. File → Export As → icon.ico
3. Select sizes to include (16, 32, 48, 256)

## Recommended Icon Sizes

For best quality on all platforms:
- 16x16 (taskbar, small icons)
- 32x32 (desktop icon small)
- 48x48 (medium icons)
- 64x64 (large icons)
- 128x128 (macOS)
- 256x256 (Windows modern)
- 512x512 (macOS Retina)
- 1024x1024 (macOS App Store)

## After Adding Icons

Run the build script:
```cmd
build.bat
```

Or use npm:
```cmd
npm run package
```

The icons will be automatically embedded in your executable!

