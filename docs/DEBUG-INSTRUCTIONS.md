# Debug Instructions - Find Why It's Stuck

I've added extensive logging to help debug the issue. Follow these steps:

## Step 1: Restart Stream Deck

**IMPORTANT**: You MUST restart Stream Deck to load the updated plugin code.

1. Right-click Stream Deck tray icon
2. Select "Quit Stream Deck"
3. Wait 5 seconds
4. Start Stream Deck again

## Step 2: Open Property Inspector Console

1. In Stream Deck, add or configure your TP-Link action
2. When the property inspector window opens, **press F12**
3. This opens the developer console
4. Keep this console open during testing

## Step 3: Try the Scan

1. Select "Tapo" device type
2. Enter your credentials:
   - Email: `tplink@richard-slater.co.uk`
   - Password: (your password)
3. Click "Login & Scan for Tapo Devices"
4. **Watch the console output**

## Step 4: Check What the Console Shows

### If you see messages like this - GOOD:
```
[PI] Tapo login button clicked
[PI] Username: tplink@richard-slater.co.uk
[PI] Password length: 13
[PI] Setting button to logging in state
[PI] Sending discoverTapoDevices message to plugin
[PI] Message sent
[PI] Received message from plugin: {action: 'tapoDevicesDiscovered', ...}
[PI] Handling tapoDevicesDiscovered - success: true
```

This means communication is working and we'll see if it succeeds.

### If you see NO messages - BAD:
This means the property inspector isn't loading the new code or JavaScript is broken.

### If you see error messages:
Copy the exact error and we can fix it.

## Step 5: Check Plugin Logs

After trying the scan, check Stream Deck logs:

```powershell
Get-ChildItem "$env:APPDATA\Elgato\StreamDeck\logs" -Filter "*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content -Tail 200 | Select-String -Pattern "TP-Link|Tapo|tplink"
```

### Look for:
- `TP-Link Plugin Loading - Version 1.0.1` (confirms plugin reloaded)
- `[Tapo] Starting discovery...` (confirms message received)
- `[Tapo] Cloud login successful` (confirms login worked)
- `[Tapo] Found 2 Tapo device(s)` (confirms devices found)
- `[Tapo] Sending success response` (confirms response sent)

### Or look for errors:
- `[Tapo] Discovery failed:` (shows what went wrong)
- `Error:` messages

## Most Likely Issues

### Issue 1: Stream Deck Not Restarted
**Symptom**: Version 1.0.1 not in logs  
**Fix**: Actually quit and restart Stream Deck

### Issue 2: WebSocket Not Connected
**Symptom**: Plugin logs show messages sent but PI console shows nothing received  
**Fix**: Check if property inspector is actually connected

### Issue 3: JavaScript Error
**Symptom**: Red errors in browser console (F12)  
**Fix**: Look at the error message - might be syntax issue

### Issue 4: Plugin Crash
**Symptom**: No plugin logs at all  
**Fix**: Check if there's a require() error or syntax error

## Quick Test

After restarting Stream Deck, run this to verify plugin loaded:

```powershell
Get-ChildItem "$env:APPDATA\Elgato\StreamDeck\logs" -Filter "*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content -Tail 50 | Select-String "Version 1.0.1"
```

If you see "Version 1.0.1", the plugin is loaded. If not, Stream Deck hasn't restarted properly.

## What to Report Back

Please share:
1. **Console output** (F12 in property inspector) - copy/paste what you see
2. **Plugin logs** - run the PowerShell command above and share results
3. **What happens** - does button stay "Logging in..." or does it change?

This will tell us exactly where it's failing.
