# IntraView - Build & Package Guide

This guide explains how to create a standalone `.exe` installer for IntraView, just like Discord, Slack, or VS Code.

---

## 🚀 Quick Start (One-Click Build)

### Option 1: Double-Click Build Script

Simply double-click one of these files:

```
📁 IntraView/
├── 📄 build.bat      ← Double-click this (Command Prompt)
└── 📄 build.ps1      ← Or right-click → Run with PowerShell
```

### Option 2: Command Line

```cmd
npm run package
```

This single command:
1. ✅ Builds the C++ overlay
2. ✅ Compiles TypeScript
3. ✅ Packages everything into an installer

---

## 📦 Output Files

After building, find your installers in the `release/` folder:

```
📁 release/
├── 📦 IntraView-Setup-1.0.0.exe      ← Windows Installer (NSIS)
├── 📦 IntraView-Portable-1.0.0.exe   ← Portable EXE (no install needed)
└── 📁 win-unpacked/                   ← Unpacked app files
```

### Which one to use?

| File | Best For |
|------|----------|
| `IntraView-Setup-1.0.0.exe` | Normal users - Creates Start Menu shortcuts, can uninstall |
| `IntraView-Portable-1.0.0.exe` | USB drives, testing - Just run it, no installation |

---

## 🛠️ Prerequisites

Before building, make sure you have:

### 1. Node.js (v18 or later)
- Download: https://nodejs.org/
- Verify: `node --version`

### 2. Visual Studio 2022 with C++
- Download: https://visualstudio.microsoft.com/
- Select "Desktop development with C++" workload
- This is needed to build the C++ overlay

### 3. CMake
- Download: https://cmake.org/download/
- Add to PATH during installation
- Verify: `cmake --version`

---

## 📋 Build Scripts Explained

### Package Commands

| Command | Description |
|---------|-------------|
| `npm run package` | Build everything + create Windows installer |
| `npm run package:win` | Same as above (explicit Windows) |
| `npm run package:portable` | Create portable EXE only |
| `npm run package:mac` | Create macOS DMG (on macOS only) |
| `npm run build:all` | Build overlay + TypeScript (no packaging) |

### Individual Build Commands

| Command | Description |
|---------|-------------|
| `npm run build:overlay` | Build C++ overlay only |
| `npm run build` | Build TypeScript only |
| `npm run build:main` | Build main process only |
| `npm run build:renderer` | Build renderer only |

---

## 🎨 Custom Icon

To add your own app icon:

1. Create a 256x256 PNG image (your logo)
2. Convert to `.ico` format using:
   - https://convertico.com/ (free online tool)
   - Or ImageMagick: `magick icon.png icon.ico`
3. Place `icon.ico` in the `assets/` folder
4. Rebuild: `npm run package`

See `assets/ICON_INSTRUCTIONS.md` for detailed instructions.

---

## 📁 What Gets Packaged

The installer includes:

```
📦 IntraView.exe
├── 📁 resources/
│   ├── 📁 app/
│   │   ├── 📁 dist/           ← Compiled TypeScript
│   │   ├── 📁 node_modules/   ← Dependencies
│   │   └── 📄 package.json
│   ├── 📁 overlay/
│   │   └── 📄 IntraViewOverlay.exe  ← C++ overlay
│   └── 📄 eng.traineddata     ← OCR data
└── 📄 (Electron runtime files)
```

---

## 🔧 Troubleshooting

### "CMake not found"
- Install CMake from https://cmake.org/download/
- Make sure to check "Add to PATH" during installation
- Restart your terminal

### "cl.exe not found" or "MSVC not found"
- Install Visual Studio 2022
- Select "Desktop development with C++" workload
- Run build from "Developer Command Prompt for VS 2022"

### "Overlay build failed"
```cmd
# Clean and rebuild
npm run clean:overlay
npm run build:overlay
```

### "Cannot find module" errors
```cmd
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Installer is too large
The installer includes Electron runtime (~150MB). This is normal.
To reduce size slightly:
- Use `--asar` flag (already enabled by default)
- Remove unused dependencies from package.json

---

## 🔐 Code Signing (Optional)

For distribution without Windows SmartScreen warnings:

### 1. Get a Code Signing Certificate
- Providers: DigiCert, Sectigo, GlobalSign
- Cost: $200-500/year

### 2. Sign During Build
Create `scripts/sign-win.js`:
```javascript
exports.default = async function(configuration) {
  // Your signing logic here
};
```

### 3. Update package.json
```json
"win": {
  "sign": "./scripts/sign-win.js"
}
```

Without signing, users will see a SmartScreen warning on first run (click "More info" → "Run anyway").

---

## 📊 Build Size Reference

Expected output sizes:
- **Installer**: ~150-200 MB
- **Portable**: ~150-200 MB  
- **Unpacked**: ~300-400 MB

Most of this is the Electron runtime. Your actual code is only a few MB.

---

## 🚀 Distribution

### Option 1: Direct Download
Host the installer on:
- GitHub Releases
- Your website
- Cloud storage (Dropbox, Google Drive)

### Option 2: Auto-Update (Advanced)
Add `electron-updater` for automatic updates:
```cmd
npm install electron-updater
```

Configure update server in package.json:
```json
"publish": {
  "provider": "github",
  "owner": "your-username",
  "repo": "intraview"
}
```

---

## 📝 Version Updates

To release a new version:

1. Update version in `package.json`:
```json
"version": "1.1.0"
```

2. Rebuild:
```cmd
npm run package
```

3. New files will be named:
   - `IntraView-Setup-1.1.0.exe`
   - `IntraView-Portable-1.1.0.exe`

---

## ✅ Checklist Before Distribution

- [ ] Updated version number in package.json
- [ ] Added custom icon (assets/icon.ico)
- [ ] Tested installer on clean Windows machine
- [ ] Tested portable version
- [ ] Overlay works when installed
- [ ] Screen capture exclusion works
- [ ] App starts correctly from Start Menu
- [ ] Uninstall works properly

---

## 🎉 Done!

Your IntraView app is now a professional Windows application with:
- ✅ One-click installer
- ✅ Start Menu shortcut
- ✅ Desktop shortcut
- ✅ Proper uninstaller
- ✅ Portable version for testing

Just like Discord! 🎮

