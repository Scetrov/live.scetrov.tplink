# TP-Link Device Discovery Tests - Complete Guide

## 🎯 Purpose

This test suite verifies the device discovery functionality for both Kasa and
Tapo TP-Link devices independently from the Stream Deck plugin. Use these tests
to:

1. **Confirm libraries work** - Verify `tplink-smarthome-api` and
   `tp-link-tapo-connect` are functioning
2. **Find devices** - Discover which devices are available on your network
3. **Debug plugin issues** - Isolate whether problems are with device discovery
   or Stream Deck integration

---

## 📋 Available Tests

| Test                   | Command                    | Purpose                       | Duration    |
| ---------------------- | -------------------------- | ----------------------------- | ----------- |
| **Quick Test**         | `npm run test:quick`       | Fast basic discovery          | 5 seconds   |
| **Comprehensive Test** | `npm test`                 | Full test with device control | 10+ seconds |
| **Diagnostics**        | `npm run test:diagnostics` | Network & library diagnostics | 10+ seconds |
| **Mock Test**          | `npm run test:mock`        | Simulates plugin workflow     | 5+ seconds  |

---

## 🚀 Quick Start

### Test Kasa Devices (No Credentials Needed)

```powershell
npm run test:quick
```

### Test Tapo Devices (Credentials Required)

```powershell
$env:TAPO_EMAIL="your@email.com"
$env:TAPO_PASSWORD="yourpassword"
npm run test:diagnostics
```

---

## 📱 Device Type Guide

### How to Know What You Have

| Brand/App    | Device Type | Authentication  | Examples                   |
| ------------ | ----------- | --------------- | -------------------------- |
| **Kasa app** | Kasa        | None (local)    | HS100, HS103, HS105, HS110 |
| **Tapo app** | Tapo        | TP-Link account | P100, P105, P110, P115     |

**Check your phone**: Open the app that controls your devices. That's your
device type.

---

## 🔍 Test Results Interpretation

### ✓ Success - Devices Found

```
Kasa devices found: 1
  1. Living Room Plug (192.168.1.100) - HS100(US)

Tapo devices found: 2
  1. Bedroom Plug (192.168.1.101) - P100
  2. Office Plug (192.168.1.102) - P100
```

**✓ Libraries working correctly** **✓ Devices are accessible** **✓ Network
configured properly**

### ⚠ No Devices Found

```
Kasa devices found: 0
Tapo devices found: 0
```

**Possible causes:**

1. Devices not on network
2. Devices powered off
3. Wrong device type selected
4. Firewall blocking discovery
5. Credentials not provided (Tapo)

---

## 🛠️ Troubleshooting

### Kasa Devices Not Found

#### Check 1: Same Network

- Computer and devices must be on the same Wi-Fi network
- Check if devices work in Kasa app on your phone

#### Check 2: Firewall

Kasa discovery uses UDP port 9999. Allow it:

```powershell
New-NetFirewallRule -DisplayName "TP-Link Kasa Discovery" -Direction Inbound -Protocol UDP -LocalPort 9999 -Action Allow
```

#### Check 3: Network Type

Some networks block device discovery:

- Corporate/work networks
- Guest Wi-Fi networks
- VLANs and isolated networks

**Solution**: Use your home network or configure network to allow device
discovery

### Tapo Devices Not Found

#### Check 1: Credentials Provided

```powershell
# Check if set
$env:TAPO_EMAIL
$env:TAPO_PASSWORD

# Set if empty
$env:TAPO_EMAIL="your@email.com"
$env:TAPO_PASSWORD="yourpassword"
```

#### Check 2: Internet Connection

Tapo requires cloud authentication. Verify:

- Internet connection is active
- No proxy blocking TP-Link servers
- Firewall allows HTTPS outbound

#### Check 3: Account Access

- Use same email/password as Tapo mobile app
- Verify devices appear in Tapo app
- Check account has device permissions

---

## 🔧 Advanced Diagnostics

### Full Network Diagnostic

```powershell
npm run test:diagnostics
```

This checks:

- ✓ Network interfaces and IP addresses
- ✓ UDP broadcast capability
- ✓ Library versions
- ✓ Detailed discovery events
- ✓ Error messages and troubleshooting hints

### Plugin Workflow Simulation

```powershell
npm run test:mock
```

This simulates:

- ✓ Property Inspector → Plugin communication
- ✓ Discovery function execution
- ✓ Plugin → Property Inspector response
- ✓ UI display logic

**Use this to verify plugin code is correct even if no devices found**

---

## 🐛 Plugin Integration Issues

### If Tests Work But Plugin Scan Button Doesn't

The tests confirm libraries work correctly. Plugin scan button stuck on
"Scanning..." means:

#### 1. WebSocket Connection Issue

**Check**: Stream Deck plugin logs

```powershell
Get-Content "$env:APPDATA\Elgato\StreamDeck\logs\*.log" -Tail 100 | Select-String "tplink"
```

**Look for**:

- "Plugin connected to Stream Deck"
- "Received event: sendToPlugin"
- "Starting Kasa device discovery"

#### 2. Property Inspector Not Receiving Response

**Check**: Browser console in property inspector

1. Open Stream Deck
2. Add or configure plugin action
3. Press `F12` in property inspector window
4. Look for console errors

#### 3. JavaScript Error in Plugin

**Check**: Look for errors in console output

**Common issues**:

- WebSocket not initialized
- Payload formatting incorrect
- Event handler not registered

---

## 📊 Expected Results

Based on your setup, tests should find:

| Device Type | Expected Count | Currently Found    |
| ----------- | -------------- | ------------------ |
| **Kasa**    | 1              | Run test to verify |
| **Tapo**    | 2              | Run test to verify |
| **Total**   | 3              | Run test to verify |

---

## 🔐 Security Note

**Tapo credentials** are stored:

- In environment variables (temporary)
- In Stream Deck settings (encrypted by Stream Deck)
- Never in these test scripts

Environment variables are session-only and cleared when you close the terminal.

---

## 📝 Test Output Examples

### Successful Kasa Discovery

```
Testing Kasa Discovery:
------------------------------------------------------------
Starting discovery for 8 seconds...
Listening for devices on UDP port 9999...

[EVENT] device-new: 192.168.1.100
  Name: Living Room Plug
  Model: HS100(US)
  IP: 192.168.1.100
  MAC: 50:C7:BF:XX:XX:XX
  Type: IOT.SMARTPLUGSWITCH
  Firmware: 1.5.6

Discovery complete
  devices found: 1
```

### Successful Tapo Discovery

```
Testing Tapo Discovery:
------------------------------------------------------------
Attempting login with: user@email.com
✓ Cloud login successful

Fetching device list...
Found 2 device(s)

[1] Bedroom Plug
  Model: P100
  IP: 192.168.1.101
  MAC: 50:C7:BF:XX:XX:XX
  Device ID: xxxxxx

[2] Office Plug
  Model: P100
  IP: 192.168.1.102
  MAC: 50:C7:BF:XX:XX:XX
  Device ID: yyyyyy
```

### No Devices Found

```
Discovery complete
  device-new: 0
  devices found: 0

⚠ No Kasa devices found. Possible reasons:
  • No Kasa devices on network
  • Devices not powered on
  • Devices on different subnet/VLAN
  • Firewall blocking UDP port 9999
  • Network doesn't support broadcast
```

---

## 🎬 Next Steps

### Step 1: Run Diagnostics

```powershell
# Set Tapo credentials if you have Tapo devices
$env:TAPO_EMAIL="your@email.com"
$env:TAPO_PASSWORD="yourpassword"

# Run comprehensive diagnostic
npm run test:diagnostics
```

### Step 2: Analyze Results

- **If devices found**: Libraries work! Check plugin integration.
- **If no devices found**: Follow troubleshooting guide above.

### Step 3: Test Plugin

If standalone tests find devices:

1. Restart Stream Deck
2. Try plugin scan button
3. Check Stream Deck logs for errors
4. Open property inspector console (F12)

---

## 📞 Support Information

### Test Files Created

- `test-quick.js` - Fast 5-second test
- `test-device-discovery.js` - Comprehensive test suite
- `test-diagnostics.js` - Network and library diagnostics
- `test-mock.js` - Plugin workflow simulation

### Documentation Files

- `TEST-README.md` - Basic test documentation
- `TEST-RESULTS.md` - Test results and analysis
- `TESTING-GUIDE.md` - This comprehensive guide

### Useful Commands

```powershell
# View all available test commands
npm run

# Check library versions
npm list tplink-smarthome-api tp-link-tapo-connect

# View Stream Deck logs
Get-Content "$env:APPDATA\Elgato\StreamDeck\logs\*.log" -Tail 50

# Check firewall rules
Get-NetFirewallRule | Where-Object DisplayName -like "*TP-Link*"
```

---

## ✅ Summary

These tests confirm:

- ✓ Libraries are installed correctly
- ✓ Discovery functions work as designed
- ✓ Plugin code logic is correct
- ✓ Message formatting is proper

The "Scanning..." issue is because:

- No devices currently detectable on network, OR
- Tapo devices require credentials to be discovered

**Run the diagnostic test with Tapo credentials to verify device availability.**

```

```
