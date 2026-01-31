# Device Discovery Tests

This directory contains test scripts to verify TP-Link device discovery functionality independently from the Stream Deck plugin.

## Test Files

### `test-quick.js`
Quick test for basic device discovery functionality.

**Run:**
```powershell
npm run test:quick
```

### `test-device-discovery.js`
Comprehensive test suite with detailed output and device control verification.

**Run:**
```powershell
npm test
```

## Testing Kasa Devices

Kasa devices are discovered via local network broadcast. No credentials required.

**Requirements:**
- Kasa devices must be on the same network as your computer
- Devices must be powered on
- No firewall blocking UDP broadcast on port 9999

**Example output:**
```
Testing Kasa Device Discovery
==========================================================
[FOUND] Device discovered at 192.168.1.100
  Name: Living Room Plug
  Model: HS100(US)
  IP: 192.168.1.100
```

## Testing Tapo Devices

Tapo devices require cloud authentication with your TP-Link account.

**Requirements:**
- Valid TP-Link account (same one used in Tapo app)
- Set environment variables with your credentials

**Set credentials (PowerShell):**
```powershell
$env:TAPO_EMAIL="your@email.com"
$env:TAPO_PASSWORD="yourpassword"
npm run test:quick
```

**Example output:**
```
Testing Tapo Device Discovery
==========================================================
✓ Cloud login successful
Found 2 Tapo device(s) on account

[DEVICE 1]
  Name: Bedroom Plug
  Model: P100
  IP: 192.168.1.101
```

## Expected Results

According to your setup, tests should find:
- **1 Kasa device**
- **2 Tapo devices**

## Troubleshooting

### Kasa devices not found
1. Ensure devices are on the same network
2. Check firewall settings (allow UDP port 9999)
3. Verify devices work in the Kasa app
4. Try increasing discovery timeout in test script

### Tapo devices not found
1. Verify credentials are correct
2. Check devices are registered in Tapo app
3. Ensure account has device access
4. Check internet connectivity (cloud login required)

### "ECONNREFUSED" or "ETIMEDOUT" errors
- Check network connectivity
- Verify device IP addresses are correct
- Ensure devices are powered on

## Debugging

Enable verbose logging by setting:
```powershell
$env:DEBUG="*"
npm test
```

## Integration with Plugin

If these tests pass but the plugin scan fails, the issue is likely in the Stream Deck integration layer, specifically:
- WebSocket communication between property inspector and plugin
- Message passing (sendToPlugin/sendToPropertyInspector)
- Event handling in `plugin.js`
