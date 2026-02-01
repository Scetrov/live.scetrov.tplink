# Release Checklist

Use this checklist for every marketplace submission or update.

## Pre-Release Preparation

### Code Quality
- [ ] All features implemented and tested locally
- [ ] No console.log statements with sensitive data
- [ ] Error handling implemented for all async operations
- [ ] WebSocket connection properly managed
- [ ] Code reviewed and cleaned up

### Version Management
- [ ] Version number updated in `manifest.json`
- [ ] Version number updated in `package.json`
- [ ] Version numbers match in both files
- [ ] Version follows semantic versioning (MAJOR.MINOR.PATCH)

### Documentation
- [ ] README.md updated with new features
- [ ] CHANGELOG created/updated with version changes
- [ ] Breaking changes documented
- [ ] New features explained with examples
- [ ] Troubleshooting section updated

### Assets
- [ ] All icons are 144x144px PNG
- [ ] Icons have transparent backgrounds
- [ ] Icons are clear and professional
- [ ] plugin-icon@2x.png exists
- [ ] All action icons exist (@2x versions)

### Dependencies
- [ ] package.json dependencies are up to date
- [ ] No security vulnerabilities (`npm audit`)
- [ ] Production dependencies only (no devDependencies in package)
- [ ] All dependencies are necessary

## Build Process

### Clean Build
- [ ] Delete `node_modules/` directory
- [ ] Delete `dist/` directory
- [ ] Run `npm install` to get fresh dependencies
- [ ] Run `.\build-plugin.ps1 -Clean`
- [ ] Build completes without errors
- [ ] Package size is reasonable (< 10 MB)

### Package Verification
- [ ] `.streamDeckPlugin` file created in `dist/`
- [ ] Filename includes correct version number
- [ ] File size is reasonable (check for bloat)
- [ ] Extract package and verify contents:
  - [ ] manifest.json present
  - [ ] plugin.js present
  - [ ] property-inspector.html present
  - [ ] package.json present
  - [ ] README.md present
  - [ ] LICENSE present
  - [ ] images/ directory with all icons
  - [ ] node_modules/ with production deps only
  - [ ] NO __tests__/ directory
  - [ ] NO tests/ directory
  - [ ] NO docs/ directory
  - [ ] NO .github/ directory
  - [ ] NO build scripts
  - [ ] NO devDependencies

## Testing

### Local Installation Test
- [ ] Close Stream Deck completely
- [ ] Uninstall previous version (if exists)
- [ ] Double-click `.streamDeckPlugin` file
- [ ] Plugin installs without errors
- [ ] Plugin appears in Stream Deck marketplace

### Functionality Tests
- [ ] Add "Toggle" action to button
- [ ] Add "Turn On" action to button
- [ ] Add "Turn Off" action to button
- [ ] Property Inspector opens for each action
- [ ] UI renders correctly

### Authentication Tests
- [ ] "Sign in to TP-Link" button works
- [ ] Modal appears correctly
- [ ] Can enter credentials
- [ ] Credentials save on sign in
- [ ] "Signed In" badge appears
- [ ] "Sign out" button works
- [ ] Credentials cleared on sign out
- [ ] Credentials persist across reopens

### Discovery Tests
- [ ] "Scan for Devices" starts discovery
- [ ] Progress bar appears and updates
- [ ] Kasa devices discovered (if available)
- [ ] Tapo devices discovered (if credentials provided)
- [ ] Discovery completes successfully
- [ ] Last scan time displays correctly
- [ ] Device dropdown populates
- [ ] Devices organized by type (Kasa/Tapo)

### Advanced Options Tests
- [ ] "Advanced Scan Options" button toggles section
- [ ] Start IP and End IP inputs work
- [ ] IP range info calculates correctly
- [ ] Custom range scanning works
- [ ] Invalid IPs handled gracefully

### Device Control Tests
- [ ] Select device from dropdown
- [ ] Device status appears
- [ ] Current state shows correctly (ON/OFF)
- [ ] Click button to toggle device
- [ ] Device actually turns on/off
- [ ] Button state updates
- [ ] "Turn On" action always turns on
- [ ] "Turn Off" action always turns off

### Persistence Tests
- [ ] Close and reopen Property Inspector
- [ ] Credentials still signed in
- [ ] Discovered devices still cached
- [ ] Selected device still selected
- [ ] Last scan time still shows
- [ ] Restart Stream Deck
- [ ] Settings persist across restart
- [ ] Buttons still control devices

### Error Handling Tests
- [ ] Network disconnected - graceful error
- [ ] Invalid credentials - error message
- [ ] Device offline - handles gracefully
- [ ] No devices found - clear message
- [ ] IP range invalid - validation works

## Documentation Preparation

### Screenshots
- [ ] Property Inspector with sign-in button
- [ ] Authentication modal
- [ ] Device discovery in progress
- [ ] Device dropdown with selections
- [ ] Device status display
- [ ] Stream Deck with configured buttons
- [ ] Advanced scan options
- [ ] All screenshots are high-quality
- [ ] All screenshots are properly cropped
- [ ] At least 3-5 screenshots prepared

### Marketplace Description
- [ ] Short description written (< 120 chars)
- [ ] Long description written with formatting
- [ ] Features list is clear and compelling
- [ ] Setup instructions are simple
- [ ] Requirements clearly stated
- [ ] Supported devices listed

### Support Materials
- [ ] GitHub repository is public
- [ ] README.md is comprehensive
- [ ] Issues section enabled
- [ ] Discussions section enabled (optional)
- [ ] Support email provided
- [ ] Response plan for user issues

## Submission Process

### Elgato Developer Portal
- [ ] Developer account created/verified
- [ ] Profile completed
- [ ] Payment information set (if applicable)

### Submission Form
- [ ] Plugin package uploaded
- [ ] Plugin name correct: "TP-Link Smart Control"
- [ ] Version correct: 2.0.0
- [ ] Category correct: "Smart Home"
- [ ] Author correct: "Scetrov"
- [ ] Short description filled
- [ ] Long description filled
- [ ] Screenshots uploaded (3-5)
- [ ] Marketing icon uploaded (144x144)
- [ ] GitHub URL provided
- [ ] Support email provided
- [ ] Privacy policy provided (if needed)
- [ ] Terms of service provided (if needed)

### Review Checklist
- [ ] All fields completed accurately
- [ ] No typos in descriptions
- [ ] URLs are correct and accessible
- [ ] Screenshots represent current version
- [ ] Version number matches uploaded package

### Final Checks
- [ ] Test package one more time
- [ ] Review submission for completeness
- [ ] Submit to Elgato
- [ ] Note submission date/time
- [ ] Save confirmation/reference number

## Post-Submission

### Immediate Actions
- [ ] Create Git tag for this version: `git tag v2.0.0`
- [ ] Push tag to GitHub: `git push origin v2.0.0`
- [ ] Create GitHub release with:
  - [ ] Version tag
  - [ ] Release notes
  - [ ] Changelog
  - [ ] `.streamDeckPlugin` file attached
- [ ] Update README.md badges (if applicable)

### Monitoring
- [ ] Check developer portal for review status
- [ ] Monitor email for Elgato communications
- [ ] Be ready to respond to review feedback
- [ ] Plan for updates if changes requested

### After Approval
- [ ] Test download from marketplace
- [ ] Verify marketplace listing appears correctly
- [ ] Update GitHub README with marketplace link
- [ ] Announce release on social media (optional)
- [ ] Monitor GitHub issues for user feedback
- [ ] Plan next version features

## Version History

Use this table to track releases:

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 2.0.0 | 2026-02-01 | Built | Initial marketplace release |
| | | | Modern UI, unified discovery |
| | | | |

## Notes

Add any version-specific notes here:

- v2.0.0: Complete rewrite with modern UI, modal auth, dropdown selection
- Future: Consider adding energy monitoring for HS110/P110 devices
- Future: Add scheduling/scenes support
- Future: Multi-action support (short/long press)

---

**Last Updated:** February 1, 2026
**Next Review:** Before next release
