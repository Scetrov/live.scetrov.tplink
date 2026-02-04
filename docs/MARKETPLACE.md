# Elgato Marketplace Submission Guide

This document provides step-by-step instructions for submitting the TP-Link
Smart Control plugin to the Elgato Marketplace.

## Pre-Submission Checklist

### Required Files ✓

- [x] `manifest.json` - Plugin metadata and configuration
- [x] `plugin.js` - Main plugin code
- [x] `property-inspector.html` - Configuration UI
- [x] `package.json` - Node.js dependencies
- [x] `README.md` - User documentation
- [x] `LICENSE` - MIT License file
- [x] `images/` - All required icons

### Required Icons ✓

All icons must be PNG format with transparent backgrounds:

- [x] `plugin-icon@2x.png` - 144x144px (plugin icon in marketplace)
- [x] `plug-toggle@2x.png` - 144x144px (toggle action icon)
- [x] `plug-on@2x.png` - 144x144px (turn on action icon)
- [x] `plug-off@2x.png` - 144x144px (turn off action icon)

### Manifest Requirements ✓

- [x] Valid UUID format: `live.scetrov.tplink`
- [x] Version number: `2.0.0`
- [x] Minimum Stream Deck version: `6.0`
- [x] Node.js version specified: `20`
- [x] Clear description under 120 characters
- [x] Author name specified
- [x] Category set to "Smart Home"
- [x] URL pointing to GitHub repository

### Code Quality ✓

- [x] No console.log statements with sensitive data
- [x] Error handling implemented
- [x] WebSocket connection properly managed
- [x] Dependencies use production versions
- [x] All credentials stored in global settings

## Building the Distribution Package

### 1. Prepare for Build

Ensure your plugin is working correctly:

````powershell
# Test the plugin locally
# Install in Stream Deck and verify all features work

# Update version in manifest.json if needed
# Current version: 2.0.0
```text

### 2. Run the Build Script

```powershell
# Navigate to plugin directory
cd "c:\Users\mcp\AppData\Roaming\Elgato\StreamDeck\Plugins\live.scetrov.tplink.sdPlugin"

# Run build script
.\build-plugin.ps1

# For a clean build (removes previous dist/)
.\build-plugin.ps1 -Clean
```text

The script will:

1. Install production dependencies
2. Copy required files
3. Remove test files and dev dependencies
4. Create `.streamDeckPlugin` package in `dist/` folder
5. Restore dev dependencies for continued development

### 3. Test the Package

```powershell
# The package is created at:
dist/live.scetrov.tplink.v2.0.0.streamDeckPlugin

# Test installation:
# 1. Close Stream Deck software
# 2. Double-click the .streamDeckPlugin file
# 3. Stream Deck will open and install the plugin
# 4. Verify all functionality works
```text

### 4. Package Contents Verification

The package should contain:

```text
live.scetrov.tplink.v2.0.0.streamDeckPlugin (ZIP file)
├── manifest.json
├── package.json
├── plugin.js
├── property-inspector.html
├── README.md
├── LICENSE
├── images/
│   ├── plugin-icon@2x.png
│   ├── plug-toggle@2x.png
│   ├── plug-on@2x.png
│   └── plug-off@2x.png
└── node_modules/
    ├── tplink-smarthome-api/
    ├── tp-link-tapo-connect/
    └── ws/
```text

The package should NOT contain:

- `__tests__/` directory
- `tests/` directory
- `docs/` directory
- `.github/` directory
- Build scripts
- Development dependencies
- Test files

## Marketplace Submission Process

### 1. Create Developer Account

1. Visit https://developer.elgato.com
2. Sign up for a developer account
3. Verify your email address
4. Complete your profile

### 2. Submit Plugin

1. Log in to the Elgato Developer Portal
2. Click "Submit Plugin"
3. Fill out the submission form:

**Basic Information:**

- Plugin Name: `TP-Link Smart Control`
- Version: `2.0.0`
- Category: `Smart Home`
- Short Description: `Control TP-Link Kasa and Tapo smart plugs`
- Long Description: (Copy from README.md Features section)

**Technical Details:**

- Supported Platforms: Windows 10+, macOS 10.15+
- Stream Deck Compatibility: 6.0+
- Node.js Version: 20

**Upload Files:**

- Plugin Package: `live.scetrov.tplink.v2.0.0.streamDeckPlugin`
- Screenshots: (Recommended: 3-5 screenshots showing the plugin in action)
- Marketing Icon: `plugin-icon@2x.png` (144x144)

**Additional Information:**

- GitHub Repository: https://github.com/Scetrov/live.scetrov.tplink
- Support Email: (Your email)
- Privacy Policy: (If collecting any data)
- Terms of Service: (Optional)

### 3. Provide Screenshots

Recommended screenshots:

1. Property Inspector showing device discovery
2. Stream Deck with configured buttons
3. Device status display
4. Authentication modal
5. Advanced scan options

Take high-quality screenshots showing:

- Clean, professional UI
- Plugin in use with real devices
- Configuration process
- Key features highlighted

### 4. Write Plugin Description

Use this template for the marketplace description:

```text
Control your TP-Link Kasa and Tapo smart plugs directly from Stream Deck.

FEATURES:
• Automatic device discovery for both Kasa and Tapo devices
• Toggle, turn on, or turn off actions
• Real-time device status display
• Cloud sync with TP-Link account
• Advanced network scanning options
• Persistent configuration across sessions
• Support for HS100, HS110, P100, P110, and more

SETUP:
1. Add the TP-Link action to a button
2. Sign in with your TP-Link account (for Tapo devices)
3. Scan for devices on your network
4. Select your device from the dropdown
5. Start controlling your smart plugs!

REQUIREMENTS:
• TP-Link Kasa or Tapo smart plug on the same network
• TP-Link account (for Tapo devices and enhanced features)
• Stream Deck software 6.0 or later

SUPPORTED DEVICES:
• Kasa: HS100, HS103, HS105, HS110, KP303, and more
• Tapo: P100, P105, P110, P115, and more
```text

### 5. Review and Submit

Before submitting:

- [ ] Test plugin on a clean Stream Deck installation
- [ ] Verify all three actions work (toggle, on, off)
- [ ] Test with both Kasa and Tapo devices
- [ ] Check all icons display correctly
- [ ] Verify property inspector loads and saves settings
- [ ] Test device discovery with and without credentials
- [ ] Review all text for typos and clarity
- [ ] Ensure README.md is comprehensive

## After Submission

### Review Process

1. Elgato will review your submission (typically 3-5 business days)
2. They may request changes or clarifications
3. Address any feedback promptly
4. Once approved, your plugin will be published

### Post-Publication

1. Monitor GitHub issues for user feedback
2. Provide support via email/GitHub
3. Release updates for bug fixes and new features
4. Update marketplace listing when releasing new versions

## Updating the Plugin

To release an update:

1. Update version in `manifest.json` and `package.json`
2. Document changes in README.md
3. Run build script: `.\build-plugin.ps1 -Clean`
4. Test the new package thoroughly
5. Submit update to Elgato Marketplace
6. Create GitHub release with changelog

## Support and Resources

**Elgato Resources:**

- Developer Portal: https://developer.elgato.com
- SDK Documentation: https://docs.elgato.com/sdk
- Developer Forums: https://forum.elgato.com
- SDK Examples: https://github.com/elgatosf/streamdeck

**Plugin Resources:**

- GitHub Repository: https://github.com/Scetrov/live.scetrov.tplink
- Issue Tracker: https://github.com/Scetrov/live.scetrov.tplink/issues
- Discussions: https://github.com/Scetrov/live.scetrov.tplink/discussions

## Troubleshooting

### Build Issues

**"npm install failed":**

- Check internet connection
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules/` and run build again

**"manifest.json not found":**

- Ensure you're in the plugin directory
- Check file permissions

### Installation Issues

**Plugin won't install:**

- Close Stream Deck completely
- Check file extension is `.streamDeckPlugin`
- Verify package isn't corrupted (re-build if needed)

**Plugin appears but doesn't work:**

- Check Stream Deck logs: `%APPDATA%\Elgato\StreamDeck\Logs\`
- Verify Node.js version 20 is installed
- Check all dependencies are included in package

### Marketplace Submission Issues

**Rejection for "Invalid Icons":**

- Ensure all icons are exactly 144x144 pixels
- Use PNG format with transparent background
- Icons should be clear and professional

**Rejection for "Incomplete Documentation":**

- Add more detail to README.md
- Include setup instructions
- Document all features

**Rejection for "Missing Dependencies":**

- Ensure `node_modules/` is included in package
- Production dependencies only (no dev dependencies)

## Version History

- **v2.0.0** - Initial marketplace release
  - Modern UI with modal authentication
  - Unified device discovery
  - Dropdown device selection
  - Advanced IP range configuration
  - Real-time device status
  - Persistent discovery results

## License

This plugin is released under the MIT License. See LICENSE file for details.

---

For questions or support, please open an issue on GitHub:
https://github.com/Scetrov/live.scetrov.tplink/issues
````
