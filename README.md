<div align="center">
  <img src="build-asset/icon.png" alt="WizardJS Logo" width="128" height="128">
  
  # WizardJS
  
  **The Ultimate JavaScript & TypeScript Playground**
  
  *Open source alternative to RunJS*
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Electron](https://img.shields.io/badge/Electron-Latest-blue.svg)](https://electronjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
  [![Monaco Editor](https://img.shields.io/badge/Monaco-VS%20Code%20Editor-blue.svg)](https://microsoft.github.io/monaco-editor/)
  
</div>

---

## Key Features

### Complete Language Support
- **Native JavaScript** - Full ES2020+ execution
- **Official TypeScript** - Microsoft transpiler integrated
- **Automatic detection** of syntax
- **Real-time transpilation** without configuration

### Advanced Customization
- **Multiple themes**: GitHub Dark, Tomorrow Night Bright
- **5 professional fonts**: JetBrains Mono, Fira Code, Consolas, Monaco, Menlo
- **Multi-language**: English & Spanish
- **Persistent configuration** in real-time

### World-Class Editor
- **Monaco Editor** (same as VS Code)
- **Complete IntelliSense** with tooltips and autocompletion
- **Advanced syntax highlighting**
- **Real-time parameter suggestions**
- **Bracket pair colorization** and indentation guides

### Intelligent Execution
- **Smart auto-run** - Only executes complete code
- **Security system** with timeouts and limits
- **Complete sandbox** for isolated execution
- **Detailed timestamps** and log types

### User Experience
- **Multi-tab support** with independent editors
- **Resizable split panels** between editor and output
- **Complete file management** (New, Open, Save)
- **Stop button** to interrupt running code
- **Professional keyboard shortcuts**
- **Intuitive settings panel**
- **Responsive and modern interface**

## Download

Get the latest release for your platform:

| Platform | Download |
|----------|----------|
| **macOS (Apple Silicon)** | [WizardJS-macOS-AppleSilicon.zip](https://github.com/FranciscoJBrito/WizardJS/releases/latest) |
| **macOS (Intel)** | [WizardJS-macOS-Intel.zip](https://github.com/FranciscoJBrito/WizardJS/releases/latest) |
| **Windows** | [WizardJS-Setup.exe](https://github.com/FranciscoJBrito/WizardJS/releases/latest) |
| **Linux (Debian/Ubuntu)** | [wizardjs.deb](https://github.com/FranciscoJBrito/WizardJS/releases/latest) |
| **Linux (RedHat/Fedora)** | [wizardjs.rpm](https://github.com/FranciscoJBrito/WizardJS/releases/latest) |

### macOS Installation

> ⚠️ **Important Note for macOS Users**
> 
> WizardJS is not signed with an Apple Developer ID certificate ($99/year). This is an open-source project and we prefer to invest resources in development rather than certificates. As a result, macOS will show a security warning when you try to open the app.

**Step-by-step installation:**

1. **Download** the ZIP for your chip:
   - Apple Silicon (M1/M2/M3): `WizardJS-macOS-AppleSilicon.zip`
   - Intel: `WizardJS-macOS-Intel.zip`

2. **Unzip** the downloaded file

3. **Move** `WizardJS.app` to `/Applications`

4. **Remove the quarantine attribute** (required for unsigned apps):
   
   Open Terminal and run:
   ```bash
   xattr -cr /Applications/WizardJS.app
   ```

5. **Open the app** - It should now launch without issues

**Why is this necessary?**

When you download an app from the internet, macOS adds a "quarantine" attribute. Without an Apple Developer ID signature ($99/year), macOS marks the app as "damaged" even though it's perfectly safe. The `xattr -cr` command removes this quarantine flag.

**Alternative method (if the above doesn't work):**
1. Try to open the app (it will fail)
2. Go to **System Preferences → Security & Privacy → General**
3. Click **"Open Anyway"** next to the WizardJS message

---

## Development

### Prerequisites
- **Node.js** (version 20 or higher)
- **npm** (included with Node.js)
- **macOS, Windows, or Linux**

### Installation

```bash
# Clone the repository
git clone https://github.com/FranciscoJBrito/WizardJS.git
cd WizardJS

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Build

```bash
# Create executable for your platform
npm run make

# Build for specific architecture (macOS)
npm run make -- --arch=arm64  # Apple Silicon
npm run make -- --arch=x64    # Intel

# Package only (without installer)
npm run package

# Clean build files
npm run clean
```

### Immediate Usage

1. **Open WizardJS** and you'll see the editor ready
2. **Write code** in JavaScript or TypeScript
3. **Automatic execution** when code is complete
4. **Customize** themes, fonts and language in Settings

## Keyboard Shortcuts

| Action | Shortcut | Description |
|--------|----------|-------------|
| **Execute** | `⌘R` / `Ctrl+R` | Runs the current code |
| **Stop** | `⌘.` / `Ctrl+.` | Stops code execution |
| **Save** | `⌘S` / `Ctrl+S` | Saves the current file |
| **New Tab** | `⌘T` / `Ctrl+T` | Creates a new tab |
| **Open** | `⌘O` / `Ctrl+O` | Opens an existing file |
| **Clear** | `⌘K` / `Ctrl+K` | Clears the output |
| **Settings** | `⌘,` / `Ctrl+,` | Opens the settings panel |

## Technology Stack

### Frontend & UI
- **Monaco Editor** - VS Code editor integrated
- **TypeScript** - Main project language
- **CSS3** - Modern and responsive styles
- **Font Awesome** - Professional iconography

### Build & Development
- **Electron** - Cross-platform framework
- **Electron Forge** - Complete toolchain
- **Vite** - Ultra-fast build tool
- **ESLint** - Code linting and quality

### Transpilation & Execution
- **TypeScript Compiler** - Official transpiler
- **Monaco TypeScript Worker** - IntelliSense
- **Sandbox Execution** - Secure execution
- **Auto-run Intelligence** - Complete code detection

## Project Structure

```
wizardjs/
├── src/
│   ├── main.ts                    # Electron main process
│   ├── preload.ts                  # Preload script
│   ├── index.css                   # Application styles
│   └── renderer/
│       ├── index.ts                # Renderer entry point
│       ├── app/
│       │   └── WizardJSApp.ts      # Main application class
│       ├── core/
│       │   ├── EditorManager.ts    # Monaco editor management
│       │   ├── ExecutionEngine.ts  # Code execution engine
│       │   ├── TabsManager.ts      # Tab state management
│       │   └── Themes.ts           # Editor themes
│       ├── ui/
│       │   ├── Output.ts           # Output panel
│       │   ├── SettingsPanel.ts    # Settings UI
│       │   ├── SplitResizer.ts     # Panel resizing
│       │   ├── TabsView.ts         # Tabs UI
│       │   └── Toolbar.ts          # Toolbar buttons
│       ├── services/
│       │   ├── I18n.ts             # Internationalization
│       │   └── SettingsStore.ts    # Settings persistence
│       ├── utils/
│       │   ├── codeGuards.ts       # Security guards
│       │   └── tsHelpers.ts        # TypeScript helpers
│       └── config/
│           ├── constants.ts        # App constants
│           └── types.ts            # TypeScript types
├── index.html                      # Main HTML structure
├── package.json                    # Dependencies and scripts
└── forge.config.ts                 # Electron Forge configuration
```

## Contributing

Contributions are welcome! If you want to contribute:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is under the MIT License. See the `LICENSE` file for more details.

## Acknowledgments

- Inspired by [RunJS](https://runjs.app/) - The commercial playground reference
- Built with [Monaco Editor](https://microsoft.github.io/monaco-editor/) - VS Code editor
- Powered by [Electron](https://www.electronjs.org/) - Cross-platform framework
- [TypeScript](https://www.typescriptlang.org/) - Official transpiler integrated
- [Electron Forge](https://www.electronforge.io/) - Complete toolchain

---

<div align="center">
  
  ### Do you like WizardJS?
  
  [![GitHub stars](https://img.shields.io/github/stars/FranciscoJBrito/WizardJS?style=social)](https://github.com/FranciscoJBrito/WizardJS/stargazers)
  [![GitHub forks](https://img.shields.io/github/forks/FranciscoJBrito/WizardJS?style=social)](https://github.com/FranciscoJBrito/WizardJS/network/members)
  
  **Give the repository a star!**
  
  ---
  
  ### Community
  
  **Found a bug?** → [Report an issue](https://github.com/FranciscoJBrito/WizardJS/issues)
  
  **Have an idea?** → [Start a discussion](https://github.com/FranciscoJBrito/WizardJS/discussions)
  
  **Want to contribute?** → [Contribution guide](https://github.com/FranciscoJBrito/WizardJS/blob/main/CONTRIBUTING.md)
  ---
  
  ### Project Status
  
  ![GitHub release](https://img.shields.io/github/v/release/FranciscoJBrito/WizardJS)
  ![GitHub last commit](https://img.shields.io/github/last-commit/FranciscoJBrito/WizardJS)
  ![GitHub issues](https://img.shields.io/github/issues/FranciscoJBrito/WizardJS)
  ![GitHub pull requests](https://img.shields.io/github/issues-pr/FranciscoJBrito/WizardJS)
  
  **Made with love by [Francisco Brito](https://github.com/FranciscoJBrito)**
  
</div>
