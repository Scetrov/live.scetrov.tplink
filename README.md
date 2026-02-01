# TP-Link Smart Control Plugin for Elgato Stream Deck

[![CI](https://github.com/Scetrov/live.scetrov.tplink/actions/workflows/ci.yml/badge.svg)](https://github.com/Scetrov/live.scetrov.tplink/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Scetrov/live.scetrov.tplink?label=release)](https://github.com/Scetrov/live.scetrov.tplink/releases)
[![License](https://img.shields.io/github/license/Scetrov/live.scetrov.tplink.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18%20|%2020-blue.svg)](https://nodejs.org/)
[![Integration (manual)](https://github.com/Scetrov/live.scetrov.tplink/actions/workflows/integration.yml/badge.svg)](https://github.com/Scetrov/live.scetrov.tplink/actions/workflows/integration.yml)

Control your TP-Link Kasa and Tapo smart plugs directly from your Elgato
Stream Deck. This plugin provides seamless integration with both product
lines and supports device discovery, power control, and status updates.

## Table of Contents

- Features
- Installation
- Quick Start
- Configuration
- Discovery System
- Troubleshooting
- Development
- Continuous Integration
- License

## Features

### Multi-Device Support

- **Kasa Devices**: HS100, HS110, and other Kasa smart plugs
- Automatic device type detection

- **Unified Discovery System**: Finds both Kasa and Tapo devices in one scan

**Multi-Method Detection**:

- UDP broadcast discovery for Kasa devices
- ARP table scanning for TP-Link MAC addresses
- Network port scanning (Port 80 for Tapo, Port 9999 for Kasa)
- Cloud API integration for Tapo device names
- Local verification with TP-Link account credentials

- **Result Caching**: Discovered devices are cached to avoid repeated scans

### Control Options

Three action types for flexible control:

- **Toggle**: Switch device on/off with each button press
- **Turn On**: Always turn the device on
- **Turn Off**: Always turn the device off

### Persistent Configuration

- **Global Credentials**: TP-Link account credentials saved globally and
   shared across all buttons
- **Cached Discovery**: Device list persists across plugin loads
- **Per-Button Settings**: Each button remembers its assigned device

## Installation

1. Download the plugin from the [Releases][releases] page
2. Double-click the `.streamDeckPlugin` file to install

## Quick Start

### 1. Add a Control Action

- Drag the "TP-Link Toggle" (or "Turn On"/"Turn Off") action onto a
   button
- The Property Inspector will open automatically

### 2. Sign in to TP-Link Account (For Tapo Devices)

- Click **"Sign in to TP-Link"** button at the top of the Property Inspector
- A modal dialog will appear
- Enter your TP-Link account email and password
- Click **"Sign In"** to save credentials
- Credentials are saved globally and shared across all buttons
- Required for Tapo devices and improved device discovery
- Kasa devices work without signing in

### 3. Discover Devices

- Click **"Scan for Devices"** button

  - The scan will:

    - Take 30-60 seconds to complete
    - Show a progress bar with current stage
    - Find both Kasa and Tapo devices automatically
    - Cache results across sessions
    - Display last scan time on subsequent opens

  - **Advanced Options** (optional):
    - Click **"Advanced Scan Options"** to specify custom IP range
    - Enter Start IP and End IP addresses to limit scan scope
    - Useful for large networks to reduce scan time
    - Leave empty to auto-detect and scan all network interfaces

### 4. Select Your Device

- Choose a device from the **"Select Device"** dropdown menu

  - Devices are organized by type:
    - **Kasa Devices**: Ready to use immediately
    - **Tapo Devices**: May require manual IP entry if not auto-detected
    - **Unverified Devices**: Devices found via network scan but not verified
  
  - "Cloud Only" labels indicate devices without local IP addresses
  - Device IP and type are automatically filled when selected

### 5. View Device Status (Real-time)

- After selecting a device, the **Device Status** panel appears below
- Shows current information:
  - **Device Name**: Friendly name of the device
  - **Device Type**: KASA or TAPO
  - **Current State**: ON (green) / OFF (red)
  - **Model**: Device model number
- Status updates automatically when device is queried

### 6. Test Control

- Press the button to toggle your device
- The button will update to show the current power state

### Discovery System

The plugin uses a sophisticated tiered discovery approach:

#### Stage 1: Kasa UDP Discovery (0-25%)

- Broadcasts to local network subnets
- Fastest method for Kasa devices
- Limited by Windows Firewall in some environments

#### Stage 2: ARP Table Scan (25-30%)

- Checks system ARP table for TP-Link MAC addresses
- Identifies devices that have communicated with your computer

- Supported MAC prefixes:
- 40-8d-5c, 98-da-c4, 50-c7-bf, b0-4e-26, 60-a4-b7
- a8-42-a1, 3c-6a-9d, c0-c9-e3, 5c-e9-31, 54-af-97
- 1c-3b-f3, b4-b0-24

#### Stage 3: Network Port Scanning (30-60%)

- Scans detected subnets for open ports:
- Port 9999: Kasa devices
- Port 80: Tapo devices
- Automatically expands to scan ±15 subnets on /16 networks
- Batched scanning for improved performance

#### Stage 4: Cloud Discovery (60-80%)

- Logs into TP-Link cloud with provided credentials
- Retrieves device names and IDs from your account
- Provides friendly names even when IPs aren't available

#### Stage 5: Local Verification (80-100%)

- Attempts to verify Tapo devices via local login
- Matches cloud devices with network-discovered IPs
- Confirms device accessibility

### Caching and Persistence

**Discovery Results Persistence**:

- Discovery results are saved to global settings and persist across:
  - Stream Deck restarts
  - Plugin reloads
  - Property Inspector re-opens

- Cached device list loads instantly on Property Inspector open
- Cache age is displayed on the scan button (e.g., "Last: 5m 23s ago")
- Results remain until next scan is performed

**Credential Storage**:

- TP-Link credentials are stored in Stream Deck's global settings
- Encrypted and shared across all plugin buttons
- Accessible via the "Sign in to TP-Link" modal
- Can be cleared by clicking "Sign out from TP-Link"

**When to Re-Scan**:

- New devices added to your network
- Device IP addresses change (DHCP renewal)
- After network configuration changes
- If device names or states appear incorrect
- When adding devices to your TP-Link cloud account

### User Interface Features

**Sign-in Modal**:

- Clean modal dialog for credential entry
- Separates authentication from device configuration
- Shows signed-in status badge when authenticated
- One-click sign-out for credential management

**Dropdown Device Selection**:

- Organized by device category (Kasa, Tapo, Unverified)
- Shows device count per category
- Displays IP addresses or "Cloud Only" status
- Auto-selects currently configured device

**Advanced Scan Options**:

- Collapsible section to reduce UI clutter
- Custom IP range specification (Start IP → End IP)
- Live count of IPs to be scanned
- Falls back to auto-detection when not specified

**Real-time Device Status**:

- Automatically queries device after selection
- Color-coded power state (green=ON, red=OFF)
- Shows device name, type, and model
- Updates without manual refresh

## Troubleshooting

### Kasa Devices Not Found

**Symptoms**: HS100/HS110 not appearing in discovery results

**Solutions**:

**Solutions**:

1. **Check Network Connectivity**:
   - Verify device is powered on
   - Ensure device is connected to Wi-Fi
   - Confirm device is on the same network/VLAN as your computer

2. **Windows Firewall**:
   - Firewall may block UDP broadcasts on port 9999
   - Temporarily disable to test
   - Add firewall rule allowing UDP 9999 outbound/inbound

3. **Port Scanning**:
   - Plugin will find devices via port scanning if UDP fails
   - Ensure device subnet is within ±15 of your computer's subnet
   - Check router admin panel for device IP

4. **Manual Configuration**:
   - Select "Kasa" device type
   - Enter IP address manually
   - Device will be controlled even if not discovered

### Tapo Devices Showing "IP Required"

**Symptoms**: Tapo device found in cloud but IP shows "Unknown"

**Solutions**:

1. **Check Router DHCP List**:
   - Log into router admin panel
   - Find Tapo device in connected devices
   - Note the IP address

2. **Manual IP Entry**:
   - Select the Tapo device from the list
   - Enter the IP address in the IP field
   - Save settings
   - Verify TP-Link account credentials are entered

### Discovery Takes Too Long

### Prerequisites

- Node.js 20 or higher
- Elgato Stream Deck software
- TP-Link Kasa and/or Tapo devices for testing

### Project Structure

```text
live.scetrov.tplink.sdPlugin/
├── plugin.js                    # Main plugin logic
├── property-inspector.html      # Configuration UI
├── manifest.json                # Plugin metadata
├── package.json                 # Node.js dependencies
├── images/                      # Plugin icons
├── __tests__/                   # Jest unit tests
│   ├── cidr.test.js
│   ├── scan.test.js
│   └── ...
├── __tests__/integration/       # (optional) integration tests
└── docs/                        # Documentation
   ├── TESTING-GUIDE.md
   ├── TEST-RESULTS.md
   └── ...
```

### Key Dependencies

- `tplink-smarthome-api` (^5.0.0): Kasa device communication
- `tp-link-tapo-connect` (^2.0.8): Tapo cloud and local API
- `ws` (^8.16.0): WebSocket for Stream Deck communication

### Building and Testing

**Install Dependencies**:

```powershell
npm install
```

**Run Unit Tests (Jest)**:

```powershell
npm test
```

**Run Integration Tests (if present)**:

```powershell
# Runs only integration tests located in __tests__/integration
npm test -- --testPathPattern="__tests__/integration"
```

Note: Unit tests run automatically on push and on pull requests via
the GitHub Actions workflow `.github/workflows/ci.yml`.

Integration tests can be run manually from the Actions UI using the
"Integration Tests (manual)" workflow. Set repository secrets
`TAPO_EMAIL` and `TAPO_PASSWORD` when running tests against real devices.

### Pre-commit hooks

If you use `pre-commit` ([pre-commit][pre-commit]), install hooks locally
to run markdown lint and tests before committing:

```powershell
pip install pre-commit
pre-commit install
# Run against all files once
pre-commit run --all-files
```

**Set Test Credentials** (PowerShell):

```powershell
$env:TAPO_EMAIL="your-email@example.com"
$env:TAPO_PASSWORD="yourpassword"
```

**Reload Plugin**:

```powershell
# Restart Stream Deck to reload plugin
Stop-Process -Name StreamDeck -Force
Start-Process 'C:\Program Files\Elgato\StreamDeck\StreamDeck.exe'
```

- **Global Settings**: Stores TP-Link credentials globally
- **Device Cache**: Maintains discovered device list
- **WebSocket Communication**: Connects to Stream Deck software
- **Discovery Interface**: Scan button and device list
- **Credential Management**: Global credential input
- **Cache Display**: Shows cached results and age
- **WebSocket Client**: Communicates with plugin

1. Local network detection (getLocalSubnets)
2. Kasa UDP broadcast (discoverDevices)
3. ARP table parsing (getArpTableTpLinkDevices)
4. Port scanning (scanSubnetForTpLink)
5. Cloud API query (Tapo cloudLogin/listDevicesByType)
6. Local verification (verifyTapoDevice)
7. Result aggregation and caching

### API Reference

#### Plugin → Property Inspector Messages

- `allDevicesDiscovered`: Unified discovery results
- `discoveryProgress`: Scan progress updates
- `globalCredentialsRetrieved`: Saved credentials
- `cachedDevicesRetrieved`: Cached device list

- `discoverTapoDevices`: Start Tapo discovery
- `discoverAllDevices`: Start unified discovery
- `getGlobalCredentials`: Request saved credentials
- `getCachedDevices`: Request cached results

- **UDP 9999**: Kasa device discovery (outbound broadcast)
- **TCP 9999**: Kasa device control (outbound)

### Network Topology

- Devices and computer must be on the same network or routable subnets
- AP isolation must be disabled on router
- VLANs must allow cross-VLAN communication if devices are separated

### Subnet Support

- /24 networks: Fully supported
- /16 networks: Scans ±15 subnets from detected interfaces
- /8 networks: Not recommended (too many IPs to scan)

## Privacy and Security

### Data Storage

- **Credentials**: Stored locally in Stream Deck's global settings (encrypted)
- **Device Cache**: Stored in global settings and persists across restarts
- **Discovery Results**: Saved globally and shared across all plugin buttons
- **No External Services**: Communicates only with your devices and
   with the TP-Link cloud when required

### Credential Security

- Credentials are stored by Stream Deck software (encrypted at rest)
- Transmitted over HTTPS to TP-Link cloud (for Tapo only)
- Transmitted over local network to devices
- Never logged or exposed in error messages

- Plugin does not expose any network services
- All communication is outbound only
- Local API uses TP-Link's encryption (where available)

## Known Limitations

1. **UDP Discovery and Firewalls**: Windows Firewall may block Kasa UDP
   discovery; port scanning provides a reliable fallback
2. **Tapo IP Detection**: Cloud API does not always return local IPs; a
   manual IP entry may be required in some cases
3. **DHCP Changes**: Device IP addresses may change; re-scan after DHCP
   lease renewal to refresh cache
4. **Large Networks**: Scanning /16 networks can take 30-60 seconds
   (use Advanced Options to limit scope)
5. **Cloud Dependency**: Tapo devices require cloud login for initial setup

## Contributing

- Test with both Kasa and Tapo devices
- Run test suite before submitting
- Update documentation for new features
- Follow existing code style

## Support

For issues, questions, or feature requests:

- GitHub Issues: [Issue Tracker][issues]
- Check troubleshooting section above
- Review test scripts in `tests/` folder for examples

[issues]: https://github.com/Scetrov/live.scetrov.tplink/issues
[releases]: https://github.com/Scetrov/live.scetrov.tplink/releases
[pre-commit]: https://pre-commit.com/

## Changelog

### v2.0.0 (Current)

**Major UI Redesign**:

- Modal-based authentication (Sign in/Sign out button)
- Dropdown device selection (replaces long scrollable list)
- Advanced scan options for custom IP range specification
- Real-time device status display after selection
- Persistent discovery results across sessions
- Unified single scan button for all device types

**Improvements**:

- Discovery results now save to global settings (persist across restarts)
- Last scan time displayed on scan button
- Live IP count when using advanced options
- Color-coded device state indicators (green=ON, red=OFF)
- Better UX for "Cloud Only" devices
- Reduced UI clutter with collapsible sections

### v1.0.0

- Initial release
- Kasa and Tapo device support
- Unified discovery system
- Global credential storage
- Multi-subnet scanning
- Toggle, On, and Off actions

## Acknowledgments

- Elgato for the Stream Deck SDK
- `tplink-smarthome-api` maintainers
- `tp-link-tapo-connect` maintainers
- TP-Link for device APIs (unofficial)
