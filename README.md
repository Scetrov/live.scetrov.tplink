# TP-Link Smart Control Plugin for Elgato Stream Deck

[![CI](https://github.com/Scetrov/live.scetrov.tplink/actions/workflows/ci.yml/badge.svg)](https://github.com/Scetrov/live.scetrov.tplink/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Scetrov/live.scetrov.tplink?label=release)](https://github.com/Scetrov/live.scetrov.tplink/releases)
[![License](https://img.shields.io/github/license/Scetrov/live.scetrov.tplink.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-18%20|%2020-blue.svg)](https://nodejs.org/)
[![Integration (manual)](https://github.com/Scetrov/live.scetrov.tplink/actions/workflows/integration.yml/badge.svg)](https://github.com/Scetrov/live.scetrov.tplink/actions/workflows/integration.yml)

Control your TP-Link Kasa and Tapo smart plugs directly from your Elgato Stream Deck. This plugin provides seamless integration with both product lines, supporting device discovery, power control, and real-time status updates.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Discovery System](#discovery-system)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [Continuous Integration](#continuous-integration)
- [License](#license)

## Features

### Multi-Device Support

- **Kasa Devices**: HS100, HS110, and other Kasa smart plugs
- **Tapo Devices**: P100, P110, P115, and other Tapo smart plugs
- Automatic device type detection

### Smart Discovery

- **Unified Discovery System**: Finds both Kasa and Tapo devices in one scan

**Multi-Method Detection**:

   - UDP broadcast discovery for Kasa devices

   - ARP table scanning for TP-Link MAC addresses

   - Network port scanning (Port 80 for Tapo, Port 9999 for Kasa)

   - Cloud API integration for Tapo device names

   - Local verification with TP-Link account credentials

- **Result Caching**: Discovered devices are cached to avoid repeated scans

- **Broad Network Coverage**: Scans /16 networks comprehensively (±15 subnets)

### Control Options

Three action types for flexible control:

- **Toggle**: Switch device on/off with each button press
- **Turn On**: Always turn the device on
- **Turn Off**: Always turn the device off

### Persistent Configuration

- **Global Credentials**: TP-Link account credentials saved globally and shared across all buttons
- **Cached Discovery**: Device list persists across plugin loads
- **Per-Button Settings**: Each button remembers its assigned device

## Installation

1. Download the plugin from the [Releases](https://github.com/Scetrov/live.scetrov.tplink/releases) page
2. Double-click the `.streamDeckPlugin` file to install
3. The plugin will appear in your Stream Deck actions list

## Quick Start

### 1. Add a Control Action

- Drag the "TP-Link Toggle" (or "Turn On"/"Turn Off") action onto a button
- The Property Inspector will open automatically

### 2. Configure TP-Link Account (First Time Only)

- Enter your TP-Link account email and password at the top of the Property Inspector
- These credentials are saved globally and shared across all buttons
- Required for Tapo devices and device name lookup

### 3. Discover Devices

 - Click **"Scan for All TP-Link Devices"**

- The scan will:

   - Take 30-60 seconds to complete

   - Show a progress bar with current stage

   - Find both Kasa and Tapo devices

   - Cache results for future use

### 4. Select Your Device

 - Choose a device from the discovered list:

  - **Kasa Devices**: Ready to use immediately

  - **Tapo Devices**: May require manual IP entry if not auto-detected

  - **Unverified Devices**: Devices found via network scan but not verified

 - The device name and IP will be saved to the button

### 5. Test Control

- Press the button to toggle your device
- The button will update to show the current power state

## Configuration

### Device Settings

#### Device Type

- **Kasa**: For HS100, HS110, and similar devices
- **Tapo**: For P100, P110, P115, and similar devices

#### IP Address

- Automatically populated when selecting from discovered devices
- Can be manually entered if known
- Required for all devices

#### Credentials (Tapo Only)

- Tapo devices require TP-Link account credentials
- Credentials are stored globally and reused across all buttons
- Same email/password used in the Tapo mobile app

### Discovery System

The plugin uses a sophisticated tiered discovery approach:

#### Stage 1: Kasa UDP Discovery (0-25%)

- Broadcasts to local network subnets

- Fastest method for Kasa devices

- Limited by Windows Firewall in some environments

#### Stage 2: ARP Table Scan (25-30%)

- Checks system ARP table for TP-Link MAC addresses

- Identifies devices that have communicated with your computer

- Supported MAC prefixes: 40-8d-5c, 98-da-c4, 50-c7-bf, b0-4e-26, 60-a4-b7, a8-42-a1, 3c-6a-9d, c0-c9-e3, 5c-e9-31, 54-af-97, 1c-3b-f3, b4-b0-24

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

### Caching System

**Device Cache**:

- Discovery results are cached in plugin memory

- Cache persists until Stream Deck restarts

- Subsequent Property Inspector opens show cached results instantly

- Cache age is displayed on the scan button

**When to Re-Scan**:

- New devices added to your network

- Device IP addresses change (DHCP renewal)

- After network configuration changes

- If cache is more than a few hours old

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

3. **Network Scan**:
   - Plugin scans for port 80 (Tapo devices)
   - If scan finds device, IP is auto-populated
   - Verify TP-Link account credentials are entered

### Discovery Takes Too Long

**Solutions**:

1. **Use Cached Results**:
   - Results are cached after first scan
   - Subsequent opens load instantly
   - Only re-scan when needed

2. **Limit Network Range**:
   - Plugin scans detected /16 subnets ±15
   - If you have a large network, this can be slow
   - Consider static IPs for smart devices

3. **Skip Discovery**:
   - If you know the device IP, enter it directly
   - Select device type (Kasa/Tapo)
   - No discovery needed

### Credentials Not Persisting

**Symptoms**: Have to re-enter email/password for each button

**Solutions**:

- Credentials are now saved globally (as of recent update)
- Enter once at the top of the Property Inspector
- All buttons will use the same credentials
- Reload Stream Deck if not working

### Device Control Not Working

**Symptoms**: Button press doesn't control device

**Checklist**:
**Checklist**:

1. Device type is correct (Kasa vs Tapo)
2. IP address is valid and current
3. Device is powered on and connected to network
4. For Tapo: TP-Link account credentials are saved
5. Network path between computer and device is clear
6. Try controlling device from mobile app to confirm it's functional

## Development

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
├── __tests__/integration/       # (Optional) integration tests - not run by default in CI
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

Note: Unit tests run automatically on push and pull requests via the GitHub Actions workflow `.github/workflows/ci.yml`. Integration tests can be run manually from the Actions UI using the "Integration Tests (manual)" workflow; set repository secrets `TAPO_EMAIL` and `TAPO_PASSWORD` if running integration tests against real devices.

### Pre-commit hooks

If you use `pre-commit` (https://pre-commit.com/), install hooks locally to run markdown lint and tests before committing:

```powershell
pip install pre-commit
pre-commit install
# Run against all files once
pre-commit run --all-files
```

The repository includes `.pre-commit-config.yaml` with local hooks that run `npm run lint:md` and `npm test` on commit.

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

### Architecture

#### Plugin (plugin.js)

- **DeviceManager**: Handles device discovery and control
- **Global Settings**: Stores TP-Link credentials globally
- **Device Cache**: Maintains discovered device list
- **WebSocket Communication**: Connects to Stream Deck software
- **Event Handlers**: Processes button presses and configuration changes

#### Property Inspector (property-inspector.html)

- **Configuration UI**: Device selection and settings
- **Discovery Interface**: Scan button and device list
- **Credential Management**: Global credential input
- **Cache Display**: Shows cached results and age
- **WebSocket Client**: Communicates with plugin

#### Discovery Pipeline

1. Local network detection (getLocalSubnets)
2. Kasa UDP broadcast (discoverDevices)
3. ARP table parsing (getArpTableTpLinkDevices)
4. Port scanning (scanSubnetForTpLink)
5. Cloud API query (Tapo cloudLogin/listDevicesByType)
6. Local verification (verifyTapoDevice)
7. Result aggregation and caching

### API Reference

#### Plugin → Property Inspector Messages

- `devicesDiscovered`: Kasa devices found
- `tapoDevicesDiscovered`: Tapo devices found
- `allDevicesDiscovered`: Unified discovery results
- `discoveryProgress`: Scan progress updates
- `globalCredentialsRetrieved`: Saved credentials
- `cachedDevicesRetrieved`: Cached device list

#### Property Inspector → Plugin Messages

- `discoverDevices`: Start Kasa discovery
- `discoverTapoDevices`: Start Tapo discovery
- `discoverAllDevices`: Start unified discovery
- `getGlobalCredentials`: Request saved credentials
- `getCachedDevices`: Request cached results

## Network Requirements

### Firewall Ports

- **UDP 9999**: Kasa device discovery (outbound broadcast)
- **TCP 9999**: Kasa device control (outbound)
- **TCP 80**: Tapo device control (outbound)
- **TCP 443**: Tapo cloud API (outbound)

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

- **Credentials**: Stored locally in Stream Deck's global settings
- **Device Cache**: Stored in plugin memory (lost on restart)
- **No External Services**: Communicates only with your devices and TP-Link cloud

### Credential Security

- Credentials are stored by Stream Deck software
- Transmitted over local network only
- HTTPS used for TP-Link cloud API
- No third-party services involved

### Network Security

- Plugin does not expose any network services
- All communication is outbound only
- Local API uses TP-Link's encryption (where available)

## Known Limitations

1. **UDP Discovery and Firewalls**: Windows Firewall may block Kasa UDP discovery; port scanning provides fallback
2. **Tapo IP Detection**: Cloud API doesn't always return local IPs; manual entry may be required
3. **DHCP Changes**: Device IPs may change; re-scan needed after DHCP lease renewal
4. **Large Networks**: Scanning /16 networks takes 30-60 seconds
5. **Cloud Dependency**: Tapo devices require cloud login for initial setup and name lookup

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please submit pull requests or open issues on GitHub.

### Development Guidelines

- Test with both Kasa and Tapo devices
- Run test suite before submitting
- Update documentation for new features
- Follow existing code style

## Support

For issues, questions, or feature requests:

- GitHub Issues: [Issue Tracker](https://github.com/Scetrov/live.scetrov.tplink/issues)
- Check troubleshooting section above
- Review test scripts in `tests/` folder for examples

## Changelog

### v1.0.0 (Current)

- Initial release
- Kasa and Tapo device support
- Unified discovery system
- Global credential storage
- Device caching
- Multi-subnet scanning
- Toggle, On, and Off actions

## Acknowledgments

- Elgato for the Stream Deck SDK
- `tplink-smarthome-api` maintainers
- `tp-link-tapo-connect` maintainers
- TP-Link for device APIs (unofficial)
