# GitHub Copilot Instructions for TP-Link Stream Deck Plugin

## Project Overview

This is an Elgato Stream Deck plugin that controls TP-Link Kasa and Tapo smart plugs. The plugin was developed to provide seamless integration with both product lines, featuring advanced device discovery, persistent configuration, and reliable control.

## Architecture and Design Decisions

### Technology Stack

**Runtime Environment**:
- Node.js 20+ (specified in manifest.json, tested with 25.5.0)
- Stream Deck SDK v2 (WebSocket-based communication)
- Windows environment (PowerShell for development/testing)

**Core Dependencies**:
- `tplink-smarthome-api` v5.0.0: Kasa device local API (UDP broadcast on port 9999)
- `tp-link-tapo-connect` v2.0.8: Tapo cloud and local API (HTTP/HTTPS)
- `ws` v8.16.0: WebSocket library for Stream Deck communication

**Key Design Pattern**:
- Single plugin.js file handles all backend logic
- Property inspector (HTML/JS) handles UI and configuration
- WebSocket messaging between plugin and property inspector
- Global settings for cross-button credential sharing
- In-memory caching for discovery results

### Development History and Problem-Solving

This section documents the key challenges encountered and solutions implemented during development. Understanding these decisions is critical for maintaining and extending the codebase.

#### 1. Plugin Connection and Initialization

**Problem**: Initial implementation exported `connectElgatoStreamDeckSocket` but never called it. Stream Deck would start the plugin process but it would exit with code 1, showing as "unstable" in logs.

**Root Cause**: Stream Deck passes command-line arguments (`-port`, `-pluginUUID`, `-registerEvent`, `-info`) that the plugin must parse and use to connect via WebSocket.

**Solution Implemented**:
```javascript
function parseArgs() {
  const args = {};
  const argv = process.argv;
  // Parse command line args...
  return args;
}

const args = parseArgs();
if (args.port && args.pluginUUID && args.registerEvent) {
  connectElgatoStreamDeckSocket(args.port, args.pluginUUID, args.registerEvent, args.info);
  setTimeout(() => getGlobalSettings(), 1000); // Request global settings after connection
}
```

**Key Learning**: Stream Deck plugins must:
1. Parse command-line arguments
2. Call the connection function with parsed args
3. Initialize global.WebSocket before any WebSocket usage
4. Export the connection function for compatibility

#### 2. Tapo API Discovery Method

**Problem**: Initial code called `getDeviceList()` on Tapo cloud client, which doesn't exist. Plugin crashed when attempting Tapo discovery.

**Root Cause**: Misunderstanding of tp-link-tapo-connect API. The correct method is `listDevicesByType()`.

**Solution**:
```javascript
// WRONG (old code):
const devices = await this.tapoCloudClient.getDeviceList();

// CORRECT (fixed):
const devices = await this.tapoCloudClient.listDevicesByType('SMART.TAPOPLUG');
```

**Key Learning**: Always verify API methods in library documentation. The tp-link-tapo-connect library uses:
- `cloudLogin(email, password)` → returns cloud client
- `client.listDevicesByType('SMART.TAPOPLUG')` → returns device list
- `loginDeviceByIp(email, password, ip)` → for local device control

#### 3. Tapo Device IP Detection

**Problem**: Tapo devices discovered via cloud API often had empty or missing `deviceIp` field. Property inspector would show "Unknown" for IP address, and device control would fail.

**Root Cause**: TP-Link cloud API prioritizes cloud control and doesn't always include local IPs, especially for devices not recently communicated with locally.

**Solution**: Implemented tiered discovery strategy:
1. Cloud discovery for device names and IDs
2. Local network scanning for IPs (port 80 for Tapo)
3. ARP table parsing for TP-Link MAC addresses
4. Attempt local verification when credentials available
5. Allow manual IP entry when auto-detection fails

**UI Handling**:
```javascript
// When IP is missing, don't set 'Unknown' - prompt for manual entry
if (!device.ip || device.ip === 'Unknown') {
  ipInput.value = '';
  ipInput.placeholder = 'IP Required - Enter manually or re-scan';
  ipInput.focus();
}
```

**Key Learning**: Cloud APIs may not provide complete local network information. Always provide fallback mechanisms for critical fields.

#### 4. Kasa Device Discovery on Specific Subnets

**Problem**: User reported HS110 device at 10.229.13.3 not being discovered. Initial implementation only scanned ±5 subnets on /16 networks.

**Root Cause**: `getLocalSubnets()` was too conservative. User had network interface on 10.229.2.x but device on 10.229.13.x (11 subnets away).

**Solution**: Expanded subnet scanning range from ±5 to ±15:
```javascript
if (addr.netmask === '255.255.0.0') {
  const base = parseInt(parts[2]);
  // Scan a wider range for /16 networks to catch devices on different subnets
  for (let i = Math.max(0, base - 15); i <= Math.min(255, base + 15); i++) {
    subnets.add(`${parts[0]}.${parts[1]}.${i}`);
  }
}
```

**Key Learning**: 
- Large corporate/home networks may have devices spread across many subnets
- /16 networks are common in home environments using mesh networks or VLANs
- Balance between scan coverage and performance (51 subnets found in user's environment)

#### 5. Windows Firewall Blocking UDP Discovery

**Problem**: Kasa UDP broadcast discovery (port 9999) found 0 devices despite devices being online and accessible.

**Root Cause**: Windows Firewall blocks UDP broadcasts by default. Testing showed:
- UDP broadcast sent to 255.255.255.255:9999 → no responses
- UDP broadcast to specific subnets (10.229.x.255:9999) → no responses  
- TCP connection to 10.229.13.3:9999 → successful

**Solution**: Multi-method discovery with port scanning as fallback:
```javascript
async scanSubnetForTpLink(subnet, progressCallback) {
  // Scan both Tapo (80) and Kasa (9999) ports
  Promise.all([
    this.checkPort(ip, 80, 300),   // Tapo
    this.checkPort(ip, 9999, 300)  // Kasa
  ])
}
```

**Key Learning**:
- Never rely solely on UDP broadcast in Windows environments
- TCP port scanning is more reliable but slower
- Provide multiple discovery methods for robustness
- Document firewall requirements for users

#### 6. Credential and Discovery Result Persistence

**Problem**: Users had to re-enter TP-Link credentials for every button and re-scan the network each time they opened the property inspector. This was especially painful given 30-60 second scan times on large networks.

**Requirements**:
1. Credentials shared across all buttons (global storage)
2. Discovery results cached until Stream Deck restart
3. Cache age displayed to user
4. Automatic loading of cached results

**Solution**: Implemented global settings and in-memory caching:

**Global Settings (plugin.js)**:
```javascript
let globalSettings = {}; // Shared across all buttons

function setGlobalSettings(settings) {
  globalSettings = { ...globalSettings, ...settings };
  websocket.send(JSON.stringify({
    event: 'setGlobalSettings',
    context: pluginUUID,
    payload: globalSettings
  }));
}

// Save credentials when discovery is performed
if (payload.username && payload.password) {
  setGlobalSettings({
    tapoEmail: payload.username,
    tapoPassword: payload.password
  });
}
```

**Discovery Caching**:
```javascript
class DeviceManager {
  constructor() {
    this.cachedDiscoveryResults = null;
    this.lastDiscoveryTime = null;
  }
  
  async discoverAllDevices(username, password, progressCallback) {
    const results = await /* ... perform discovery ... */;
    
    // Cache results with timestamp
    this.cachedDiscoveryResults = results;
    this.lastDiscoveryTime = Date.now();
    
    return results;
  }
}
```

**Property Inspector Integration**:
```javascript
function loadSettings() {
  requestGlobalCredentials(); // Load shared credentials
  requestCachedDevices();      // Load cached device list
}

function loadCachedDevices(payload) {
  if (payload.success) {
    const cacheMinutes = Math.floor(payload.cacheAge / 60);
    scanButton.textContent = `Scan (Last: ${cacheMinutes}m ago)`;
    displayAllDiscoveredDevices(payload); // Show cached results immediately
  }
}
```

**Key Learning**:
- Global settings (event: 'setGlobalSettings') persist across plugin lifecycle
- In-memory caching is sufficient for discovery results (cleared on restart is acceptable)
- Always show cache age to inform user decisions about re-scanning
- Request cached data on property inspector open for instant display

#### 7. Property Inspector UI Consolidation

**Problem**: Property inspector had two separate credential input sections:
1. Top unified section (tapoEmail/tapoPassword)
2. Bottom legacy section (username/password in tapoAuth div)

This created confusion and inconsistency.

**Solution**: Removed redundant bottom section and consolidated all credential handling to top inputs:
```javascript
// Top inputs (kept):
<input id="tapoEmail" type="email" placeholder="TP-Link Account Email">
<input id="tapoPassword" type="password" placeholder="TP-Link Account Password">

// Bottom section (removed):
// <div id="tapoAuth"> ... username/password inputs ... </div>

// Updated all event listeners to use top inputs:
document.getElementById('tapoEmail').addEventListener('input', function(e) {
  settings.username = e.target.value; // Still save as 'username' for compatibility
  saveSettings();
});
```

**Key Learning**: Maintain single source of truth for credentials in UI. The settings object still uses `username`/`password` keys internally for backward compatibility, but UI presents unified `tapoEmail`/`tapoPassword` fields.

#### 8. Modern UI Redesign (v2.0)

**Problem**: Users found the UI confusing with:
- Credentials exposed in plain view at the top
- Two separate scan buttons (Kasa and Unified)
- Long scrolling device list that was hard to navigate
- No way to limit scan scope on large networks
- No real-time device status feedback

**Solution**: Complete UI redesign with modern UX patterns:

**Sign-in/Sign-out Modal**:
```javascript
// Modal-based authentication instead of exposed inputs
<button id="authButton">Sign in to TP-Link</button>
<div id="authModal" class="modal">
  <div class="modal-content">
    <input id="modalEmail" type="text">
    <input id="modalPassword" type="password">
    <button id="modalSignIn">Sign In</button>
  </div>
</div>

// Dynamic button text based on auth state
if (isSignedIn) {
  authButton.innerHTML = 'Sign out from TP-Link <span class="signed-in-badge">Signed In</span>';
}
```

**Single Unified Scan Button**:
- Removed separate Kasa/Tapo scan buttons
- One "Scan for Devices" button that finds all types
- Uses globally stored credentials automatically
- Shows last scan time: "Scan for Devices (Last: 5m 23s ago)"

**Dropdown Device Selection**:
```javascript
// Replaced long list with organized dropdown
<select id="deviceSelect" class="device-dropdown">
  <optgroup label="Kasa Devices (2)">
    <option>Device Name - 192.168.1.100</option>
  </optgroup>
  <optgroup label="Tapo Devices (3)">
    <option>Device Name - 192.168.1.101</option>
    <option>Device Name - Cloud Only</option>
  </optgroup>
</select>
```

**Advanced IP Range Configuration**:
```javascript
// Collapsible advanced section
<button id="advancedButton">Advanced Scan Options</button>
<div id="advancedSection" class="advanced-section hidden">
  <input id="startIp" placeholder="192.168.1.1">
  <input id="endIp" placeholder="192.168.1.254">
  <div class="ip-range-info">Will scan 254 IP addresses</div>
</div>

// Live IP count calculation
function updateIpRangeInfo() {
  const count = endIp[3] - startIp[3] + 1;
  infoEl.textContent = `Will scan ${count} IP address${count !== 1 ? 'es' : ''}`;
}
```

**Real-time Device Status Display**:
```javascript
// Status panel appears after device selection
<div id="deviceStatus" class="device-status">
  <div class="status-row">
    <span class="status-label">Current State:</span>
    <span class="status-value status-on">ON</span>
  </div>
</div>

// Queries device immediately on selection
sendToPlugin({
  action: 'getDeviceStatus',
  ip: settings.ip,
  deviceType: settings.deviceType
});
```

**Persistent Discovery Results**:
```javascript
// Save to global settings instead of in-memory cache only
const allDevices = [
  ...results.kasa.map(d => ({ ...d, category: 'kasa' })),
  ...results.tapo.map(d => ({ ...d, category: 'tapo' })),
  ...results.unverified.map(d => ({ ...d, category: 'unverified' }))
];
setGlobalSettings({
  discoveredDevices: allDevices,
  discoveryTimestamp: Date.now()
});

// Load on PI open
if (globalSettings.discoveredDevices) {
  discoveredDevices = globalSettings.discoveredDevices;
  populateDeviceDropdown();
}
```

**Key Learning**: 
- Modal dialogs reduce visual clutter and improve security perception
- Dropdowns are more scalable than lists for 10+ items
- Advanced features should be hidden by default (progressive disclosure)
- Real-time feedback improves user confidence
- Persistence across sessions reduces repetitive tasks

### Code Organization Principles

When working on this codebase, follow these patterns:

#### Plugin.js Structure
```javascript
// 1. Imports and constants
const { Client } = require('tplink-smarthome-api');
const TPLINK_MAC_PREFIXES = [...];

// 2. Global state
let websocket = null;
let pluginUUID = null;
let globalSettings = {};

// 3. DeviceManager class
class DeviceManager {
  // Discovery methods
  async discoverDevices() { }
  async discoverTapoDevices() { }
  async discoverAllDevices() { }
  
  // Helper methods
  getLocalSubnets() { }
  scanSubnetForTpLink() { }
  checkPort() { }
  
  // Device control
  async initializeDevice() { }
  async toggleDevice() { }
  async turnOn() { }
  async turnOff() { }
}

// 4. Stream Deck integration
function connectElgatoStreamDeckSocket() { }
async function handleKeyDown() { }
async function handleWillAppear() { }
async function handleSendToPlugin() { }

// 5. Initialization
const args = parseArgs();
connectElgatoStreamDeckSocket(args.port, args.pluginUUID, args.registerEvent, args.info);
```

#### Property Inspector Pattern
```javascript
// 1. State variables
let websocket = null;
let uuid = null;
let actionInfo = null;
let settings = {};

// 2. WebSocket handlers
websocket.onopen = function() { }
websocket.onmessage = function(evt) { }

// 3. Settings management
function loadSettings() { }
function saveSettings() { }

// 4. Plugin communication
function sendToPlugin(payload) { }
function handlePluginMessage(payload) { }

// 5. UI handlers
function scanAllDevices() { }
function displayAllDiscoveredDevices(result) { }
function selectUnifiedDevice(device, category) { }

// 6. Event listeners
document.getElementById('scanAllButton').addEventListener('click', scanAllDevices);
```

### Discovery Algorithm Details

The `discoverAllDevices()` method implements a sophisticated multi-stage discovery:

```
Stage 1 (0-25%): Kasa UDP Discovery
├─ Broadcast to local subnets on port 9999
├─ 5-second discovery window
└─ Returns: [{name, type: 'kasa', ip, model, deviceId}]

Stage 2 (25-30%): ARP Table Scan
├─ Execute: arp -a
├─ Parse MAC addresses
├─ Filter for TP-Link OUI prefixes
└─ Returns: [{ip, mac}]

Stage 3 (30-60%): Network Port Scanning
├─ Get local subnets (±15 for /16)
├─ For each subnet:
│   ├─ Batch scan 50 IPs at a time (6 batches)
│   ├─ Check port 80 (Tapo) and 9999 (Kasa) simultaneously
│   └─ 300ms timeout per connection
├─ Cross-reference with ARP results
└─ Returns: [{ip, tapoPort, kasaPort, type, source}]

Stage 4 (60-80%): Cloud Discovery (if credentials provided)
├─ cloudLogin(email, password)
├─ listDevicesByType('SMART.TAPOPLUG')
├─ Extract: deviceName, deviceId, (deviceIp if available)
└─ Returns: [{name, deviceId, ip?, type: 'tapo'}]

Stage 5 (80-100%): Local Verification
├─ For each unverified candidate IP:
│   ├─ loginDeviceByIp(email, password, ip)
│   ├─ Match with cloud devices by deviceId
│   └─ Confirm device type and accessibility
└─ Returns: Verified devices with complete info

Final Result:
{
  kasa: [],      // Verified Kasa devices with full info
  tapo: [],      // Verified Tapo devices with full info  
  unverified: [] // Found via scan but not verified
}
```

### Testing Strategy

The `tests/` directory contains comprehensive validation scripts:

**Discovery Tests**:
- `test-quick.js`: Fast test of both Kasa and Tapo discovery
- `test-unified-discovery.js`: Full unified discovery validation
- `test-hs110-discovery.js`: Kasa-specific discovery with extended timeout
- `test-tapo-ip.js`: Tapo network scanning and cloud field inspection

**Network Tests**:
- `test-network-scan.js`: Full subnet scanning for ports 80/9999
- `test-tplink-identify.js`: ARP + port scan cross-reference
- `test-subnet13-scan.js`: Targeted subnet validation

**Diagnostic Tests**:
- `test-hs110-advanced.js`: UDP broadcast testing, firewall checks, network interface enumeration
- `test-specific-ips.js`: Direct IP testing for known devices

**Running Tests**:
```powershell
# Set credentials (optional but recommended)
$env:TAPO_EMAIL="your@email.com"
$env:TAPO_PASSWORD="yourpassword"

# Run any test
node tests/test-unified-discovery.js

# Clear credentials
Remove-Item Env:TAPO_EMAIL
Remove-Item Env:TAPO_PASSWORD
```

**Test Output Interpretation**:
- "Skipping Tapo (no credentials)" → Expected when env vars not set
- "Total Kasa devices: 0" → May indicate firewall blocking or no devices
- "Port 9999 open: true" → Device is accessible (firewall allows TCP)
- "UDP response from X.X.X.X" → Firewall allows UDP broadcast

### Common Maintenance Tasks

#### Adding Support for New Device Model

1. Determine if Kasa or Tapo
2. Verify API compatibility (test with existing libraries)
3. Add model to documentation
4. Test discovery and control
5. Update README with model name

#### Debugging Discovery Issues

1. Run `test-unified-discovery.js` to see full pipeline
2. Check each stage output:
   - Stage 1: Are UDP broadcasts working?
   - Stage 2: Is device in ARP table?
   - Stage 3: Is port open on target IP?
   - Stage 4: Does cloud return the device?
   - Stage 5: Can we log in locally?
3. Use `test-hs110-advanced.js` for firewall diagnostics
4. Check Stream Deck logs: `%APPDATA%\Elgato\StreamDeck\Logs\`

#### Updating Dependencies

```powershell
# Check for updates
npm outdated

# Update specific package
npm update tplink-smarthome-api

# Test after update
node tests/test-quick.js
node tests/test-unified-discovery.js

# Reload plugin
Stop-Process -Name StreamDeck -Force
Start-Process 'C:\Program Files\Elgato\StreamDeck\StreamDeck.exe'
```

#### Modifying Discovery Behavior

**To add new discovery method**:
1. Add new helper method in DeviceManager
2. Call from `discoverAllDevices()` in appropriate stage
3. Update progress reporting with new stage
4. Test with `test-unified-discovery.js`
5. Document in README

**To adjust subnet scanning range**:
```javascript
// In getLocalSubnets():
for (let i = Math.max(0, base - 15); i <= Math.min(255, base + 15); i++) {
  // Adjust -15/+15 to desired range
}
```

### WebSocket Message Protocol

**Plugin → Property Inspector**:
```javascript
{
  action: 'allDevicesDiscovered',
  kasa: [{name, type, ip, model, deviceId}],
  tapo: [{name, type, ip, model, deviceId}],
  unverified: [{ip, type, source}],
  success: true
}

{
  action: 'discoveryProgress',
  stage: 'kasa' | 'arp' | 'scan' | 'cloud' | 'verify',
  percent: 0-100,
  message: 'Human-readable progress'
}

{
  action: 'globalCredentialsRetrieved',
  tapoEmail: 'user@example.com',
  tapoPassword: 'password'
}

{
  action: 'savedDevicesRetrieved',
  devices: [{name, type, ip, model, category}],
  cacheAge: 123, // seconds
  success: true
}

{
  action: 'deviceStatusRetrieved',
  success: true,
  name: 'Living Room Plug',
  model: 'HS100',
  state: true // true=on, false=off
}
```

**Property Inspector → Plugin**:
```javascript
{
  action: 'discoverAllDevices',
  startIp: '192.168.1.1', // optional
  endIp: '192.168.1.254' // optional
}

{
  action: 'getSavedDevices'
}

{
  action: 'getGlobalCredentials'
}

{
  action: 'saveCredentials',
  email: 'user@example.com',
  password: 'password'
}

{
  action: 'clearCredentials'
}

{
  action: 'getDeviceStatus',
  ip: '192.168.1.100',
  deviceType: 'kasa' | 'tapo',
  username: 'email', // for Tapo
  password: 'password' // for Tapo
}
```
```

### Performance Considerations

**Discovery Times** (typical):
- Kasa UDP (Stage 1): 5 seconds
- ARP scan (Stage 2): <1 second  
- Port scanning (Stage 3): 15-30 seconds (depends on subnet count)
- Cloud login (Stage 4): 2-5 seconds
- Verification (Stage 5): 1-3 seconds per device

**Total**: 30-60 seconds for comprehensive discovery

**Optimization Strategies**:
1. Batch port scans (50 IPs at a time)
2. Use short timeouts (300ms) for closed ports
3. Cache results in memory
4. Skip stages when possible (e.g., if no credentials, skip cloud)
5. Parallelize port checks (Promise.all)

### Security Considerations

**Credential Storage**:
- Never log passwords in console output
- Use Stream Deck's global settings (encrypted at rest)
- Credentials never leave the local network except for TP-Link cloud API

**Network Security**:
- All device control is outbound only (no listening sockets)
- HTTPS for cloud API communication
- Local device communication uses TP-Link's encryption (Tapo) or plain TCP (Kasa)

**Code Review Checklist**:
- [ ] No passwords in console.log()
- [ ] No credentials in error messages sent to UI
- [ ] Global settings used for shared credentials
- [ ] No plaintext credential files created

### Future Enhancement Ideas

Potential improvements for consideration:

1. **Device State Monitoring**: Poll devices periodically and update button states
2. **Energy Monitoring**: Display power usage for HS110/P110 devices
3. **Scheduling**: Built-in scheduler for timed device control
4. **Scenes**: Control multiple devices with one button
5. **MQTT Integration**: Publish device states to MQTT broker
6. **Home Assistant**: Integration with Home Assistant API
7. **Discovery Optimization**: Save known IPs and check those first
8. **Multi-Action Support**: Different actions for short/long press

### Coding Style Guidelines

**Naming Conventions**:
- Classes: PascalCase (DeviceManager)
- Functions: camelCase (discoverAllDevices)
- Constants: SCREAMING_SNAKE_CASE (TPLINK_MAC_PREFIXES)
- Private helpers: camelCase with descriptive names

**Error Handling**:
```javascript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error.message);
  // Return safe default or throw with context
  return { success: false, error: error.message };
}
```

**Async/Await**:
- Prefer async/await over .then() chains
- Always handle rejections (try/catch or .catch())
- Use Promise.all() for parallelizable operations

**Comments**:
- JSDoc for all public methods
- Inline comments for non-obvious logic
- Section headers for logical groupings

### Troubleshooting Tips for Developers

**Plugin won't connect to Stream Deck**:
- Check parseArgs() is being called
- Verify command-line args are correct
- Check Stream Deck logs for error messages
- Ensure global.WebSocket is set before connection

**Discovery returns no devices**:
- Run tests outside Stream Deck (node tests/test-quick.js)
- Check firewall settings
- Verify devices are on same network
- Try direct IP connection (bypass discovery)

**Property Inspector not updating**:
- Check WebSocket connection in browser dev tools
- Verify sendToPropertyInspector() calls
- Check for JavaScript errors in PI console
- Reload Stream Deck to clear cached UI

**Changes not appearing**:
- Stream Deck caches plugin files
- Always restart Stream Deck after code changes
- Clear browser cache for PI changes
- Check file permissions (plugin must be readable)

## Quick Reference

**Restart Plugin**:
```powershell
Stop-Process -Name StreamDeck -Force
Start-Process 'C:\Program Files\Elgato\StreamDeck\StreamDeck.exe'
```

**View Logs**:
```powershell
Get-Content "$env:APPDATA\Elgato\StreamDeck\Logs\StreamDeck0.log" | Select-String "tplink"
```

**Test Plugin Loads**:
```powershell
node -e "require('./plugin.js'); console.log('Plugin loads OK')"
```

**Run Full Test Suite**:
```powershell
$env:TAPO_EMAIL="your@email.com"
$env:TAPO_PASSWORD="yourpassword"
node tests/test-unified-discovery.js
```

This documentation should provide comprehensive context for GitHub Copilot to assist with future development, debugging, and enhancements of this plugin.
