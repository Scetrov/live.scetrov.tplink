# Testing State Synchronization - Quick Guide

## Quick Test Procedure

### Prerequisites

- Stream Deck installed and running
- Plugin installed (reload after applying changes)
- At least one TP-Link device configured

### Test 1: Basic State Sync

1. Add a "TP-Link Toggle" button to Stream Deck
2. Note the current state (ON or OFF indicator)
3. Open TP-Link app on your phone
4. Toggle the same device in the app
5. **Wait 5 seconds**
6. **Verify**: Stream Deck button should update to match

✅ **Expected**: Button state changes automatically  
❌ **If fails**: Check logs for errors

### Test 2: Polling Start/Stop

1. **Check logs** (see below for location)
2. Add a TP-Link button to visible profile
3. **Verify log**: "Starting device state polling..."
4. Remove all TP-Link buttons from visible profile
5. **Verify log**: "Stopping device state polling..."

✅ **Expected**: Polling starts/stops based on button visibility  
❌ **If fails**: activeContexts may not be tracking correctly

### Test 3: Multiple Devices

1. Add 3 different TP-Link buttons to Stream Deck
2. Toggle each device via TP-Link app (one at a time)
3. Wait 5 seconds after each toggle
4. **Verify**: All buttons update to reflect device states

✅ **Expected**: All buttons stay in sync  
❌ **If fails**: Check if all devices are initialized

### Test 4: Error Handling

1. Add a TP-Link button to Stream Deck
2. Unplug the physical device from power
3. Wait 5 seconds
4. **Verify**: No errors displayed on Stream Deck (background failure)
5. Plug device back in
6. Wait 10 seconds
7. **Verify**: Button state resumes updating

✅ **Expected**: Graceful degradation, automatic recovery  
❌ **If fails**: Check error handling in updateDeviceState()

## Viewing Logs

### Windows

```powershell
# Real-time log monitoring
Get-Content "$env:APPDATA\Elgato\StreamDeck\Logs\StreamDeck0.log" -Wait | Select-String "polling|tplink|device state"

# View last 50 lines
Get-Content "$env:APPDATA\Elgato\StreamDeck\Logs\StreamDeck0.log" -Tail 50
```

### Mac

```bash
# Real-time log monitoring
tail -f ~/Library/Logs/ElgatoStreamDeck/StreamDeck0.log | grep -i "polling\|tplink\|device state"

# View last 50 lines
tail -50 ~/Library/Logs/ElgatoStreamDeck/StreamDeck0.log
```

## Expected Log Output

### Successful Polling Start

` Starting device state polling... [context-id] Action appeared with settings:
{...}

```

### Successful State Update

`
[context-id] Kasa device toggled to ON
```

### Successful Polling Stop

` Stopping device state polling...

```

### Device Communication Error (Expected)

`
[context-id] Failed to update device state: Device unreachable
```

## Common Issues

### Issue: Button not updating after external control

**Possible Causes:**

- Polling not running (check logs)
- Device not initialized (check deviceManager.devices)
- Network connectivity issue

**Debug Steps:**

1. Check if "Starting device state polling..." appears in logs
2. Verify device is reachable (ping IP address)
3. Test manual button press (should work)
4. Wait full 5 seconds for next poll

### Issue: Polling never starts

**Possible Causes:**

- Button not properly configured
- Plugin initialization failed
- WebSocket connection issue

**Debug Steps:**

1. Restart Stream Deck application
2. Remove and re-add button
3. Check for JavaScript errors in logs
4. Verify plugin.js has no syntax errors

### Issue: High CPU usage

**Possible Causes:**

- Too many buttons active (unlikely)
- Polling interval too short
- Device API responding slowly

**Debug Steps:**

1. Check activeContexts.size (should match visible button count)
2. Increase pollingIntervalMs if needed
3. Monitor device response times
4. Consider network latency issues

## Performance Verification

### Check Polling Count

Add this temporary logging to plugin.js (line ~1126):

```javascript
console.log(`Polling ${activeContexts.size} active buttons...`);
```

### Expected Output

` Starting device state polling... Polling 1 active buttons... Polling 1 active
buttons... Polling 1 active buttons...

```

### Verify Timing

Count seconds between "Polling..." messages:

- Should be approximately 5 seconds
- Small variation is normal (±100ms)

## Advanced Testing

### Test with Network Simulator

1. Install network simulator (e.g., Clumsy on Windows)
2. Add 10% packet loss
3. Verify polling continues despite occasional failures
4. Verify automatic recovery

### Test with Multiple Stream Decks

1. Configure same device on two Stream Decks
2. Toggle on Deck A
3. Verify Deck B updates within 5 seconds
4. Toggle on Deck B
5. Verify Deck A updates within 5 seconds

### Load Test

1. Add 20+ TP-Link buttons to Stream Deck
2. Monitor CPU and network usage
3. Verify all buttons update correctly
4. Check polling remains consistent

## Cleanup

After testing, remove temporary logging:

```javascript
// Remove this line if added:
console.log(`Polling ${activeContexts.size} active buttons...`);
```

Restart Stream Deck to ensure clean state.

## Test Checklist

- [ ] Basic state sync works (app → Stream Deck)
- [ ] Polling starts when first button appears
- [ ] Polling stops when last button disappears
- [ ] Multiple devices sync independently
- [ ] Error handling works (device offline)
- [ ] No excessive CPU usage
- [ ] No excessive network traffic
- [ ] Logs show expected output
- [ ] No JavaScript errors in logs
- [ ] Button state updates within 5 seconds

## Success Criteria

✅ All checklist items pass ✅ No errors in Stream Deck logs ✅ CPU usage
remains low (<1% for plugin) ✅ Network traffic is reasonable (<1KB/sec total)
✅ User experience is smooth (no lag or delay)

## Reporting Issues

If you encounter issues:

1. Collect logs (full log file)
2. Note exact steps to reproduce
3. Include device type (Kasa/Tapo, model)
4. Include network configuration (if relevant)
5. Create GitHub issue with details

## Next Steps

After verifying state sync works:

1. Update version number in manifest.json
2. Update CHANGELOG with new feature
3. Build and distribute updated plugin
4. Update documentation on GitHub

` `

```

```
