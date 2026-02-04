# Quick Distribution Guide

This is a quick reference for building and distributing your TP-Link Stream Deck
plugin.

## Build the Plugin

````powershell
# From the plugin directory, run:
.\build-plugin.ps1 -Clean
```text

This creates: `dist/live.scetrov.tplink.v2.0.0.streamDeckPlugin`

## Test the Plugin

1. Close Stream Deck software completely
2. Double-click `dist/live.scetrov.tplink.v2.0.0.streamDeckPlugin`
3. Stream Deck will open and install the plugin
4. Test all features:
   - Sign in with TP-Link account
   - Scan for devices
   - Select a device
   - Toggle the device on/off
   - Verify status updates

## Submit to Marketplace

1. Go to https://developer.elgato.com
2. Create/log in to developer account
3. Click "Submit Plugin"
4. Upload `live.scetrov.tplink.v2.0.0.streamDeckPlugin`
5. Fill in details (see MARKETPLACE.md for complete guide)
6. Submit for review

## Files Included in Package

✓ manifest.json - Plugin configuration
✓ plugin.js - Main code
✓ property-inspector.html - UI
✓ package.json - Dependencies
✓ README.md - Documentation
✓ LICENSE - MIT License
✓ images/ - All icons (144x144 PNG)
✓ node_modules/ - Production dependencies only

## Files Excluded from Package

✗ __tests__/ - Test files
✗ tests/ - Test scripts
✗ docs/ - Development documentation
✗ .github/ - CI/CD configuration
✗ build-plugin.ps1 - Build script
✗ Development dependencies

## Version Information

- **Current Version:** 2.0.0
- **Stream Deck Min:** 6.0
- **Node.js Version:** 20
- **Platforms:** Windows 10+, macOS 10.15+

## Support Resources

- Full Guide: See MARKETPLACE.md
- GitHub: https://github.com/Scetrov/live.scetrov.tplink
- Issues: https://github.com/Scetrov/live.scetrov.tplink/issues

## Common Issues

**Build fails:** Ensure you have Node.js 20+ installed and run `npm install` first.

**Plugin won't install:** Close Stream Deck completely before double-clicking the file.

**Features don't work:** Check Stream Deck logs at `%APPDATA%\Elgato\StreamDeck\Logs\`

---

For detailed submission instructions, see MARKETPLACE.md
````
