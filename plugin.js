/**
 * TP-Link Smart Control Plugin for Elgato Stream Deck
 * Supports both Kasa and Tapo smart plug devices
 */

const { Client: KasaClient } = require('tplink-smarthome-api');
const { loginDeviceByIp, cloudLogin } = require('tp-link-tapo-connect');

// Stream Deck plugin websocket
let websocket = null;
let pluginUUID = null;

/**
 * DeviceManager - Handles communication with TP-Link devices
 * Supports both Kasa (local API) and Tapo (cloud-based authentication)
 */
class DeviceManager {
  constructor() {
    this.devices = new Map(); // Store device connections by context
    this.kasaClient = new KasaClient();
    this.discoveredDevices = []; // Cache of discovered devices
    this.tapoCloudClient = null; // Tapo cloud connection
  }

  /**
   * Discover TP-Link devices on the local network
   * @returns {Array} - Array of discovered devices with name, type, and IP
   */
  async discoverDevices() {
    return new Promise((resolve) => {
      const discovered = [];
      const timeout = setTimeout(() => {
        this.kasaClient.stopDiscovery();
        this.discoveredDevices = discovered;
        console.log(`Discovery complete: found ${discovered.length} device(s)`);
        resolve(discovered);
      }, 5000); // 5 second discovery window

      this.kasaClient.startDiscovery().on('device-new', (device) => {
        device.getSysInfo().then((info) => {
          const deviceInfo = {
            name: info.alias || 'Unknown Device',
            type: 'kasa',
            ip: device.host,
            model: info.model || 'Unknown',
            deviceId: info.deviceId
          };
          discovered.push(deviceInfo);
          console.log(`Discovered: ${deviceInfo.name} (${deviceInfo.ip})`);
        }).catch((err) => {
          console.error('Error getting device info:', err);
        });
      });
    });
  }

  /**
   * Login to TP-Link cloud and discover Tapo devices
   * @param {string} username - TP-Link account email
   * @param {string} password - TP-Link account password
   * @returns {Array} - Array of discovered Tapo devices
   */
  async discoverTapoDevices(username, password) {
    try {
      console.log('Logging in to TP-Link cloud...');
      
      // Login to cloud
      this.tapoCloudClient = await cloudLogin(username, password);
      console.log('Cloud login successful');
      
      // Get device list from cloud
      const deviceList = await this.tapoCloudClient.listDevicesByType('SMART.TAPOPLUG');
      console.log(`Found ${deviceList.length} Tapo device(s) on account`);
      
      // Format device list
      const discovered = deviceList.map(device => ({
        name: device.alias || device.deviceName || 'Unknown Device',
        type: 'tapo',
        ip: device.deviceIp || 'Unknown',
        model: device.deviceModel || device.deviceType || 'Tapo Device',
        deviceId: device.deviceId
      }));
      
      return discovered;
    } catch (error) {
      console.error('Failed to discover Tapo devices:', error.message);
      throw error;
    }
  }

  /**
   * Initialize a device connection based on settings
   * @param {string} context - Stream Deck context identifier
   * @param {object} settings - Device settings (ip, type, username, password)
   */
  async initializeDevice(context, settings) {
    try {
      const { ip, deviceType, username, password } = settings;

      if (!ip) {
        console.log(`[${context}] No IP address configured`);
        return null;
      }

      // Create device object based on type
      if (deviceType === 'kasa') {
        // Kasa devices use local API without authentication
        const device = await this.kasaClient.getDevice({ host: ip });
        this.devices.set(context, { type: 'kasa', device });
        console.log(`[${context}] Kasa device initialized at ${ip}`);
        return device;
      } else if (deviceType === 'tapo') {
        // Tapo devices require authentication
        if (!username || !password) {
          console.log(`[${context}] Tapo device requires username and password`);
          this.showAlert(context);
          return null;
        }

        // Login to Tapo device
        const device = await loginDeviceByIp(username, password, ip);
        this.devices.set(context, { type: 'tapo', device });
        console.log(`[${context}] Tapo device initialized at ${ip}`);
        return device;
      }

      return null;
    } catch (error) {
      console.error(`[${context}] Failed to initialize device:`, error.message);
      this.showAlert(context);
      return null;
    }
  }

  /**
   * Toggle device power state
   * @param {string} context - Stream Deck context identifier
   * @returns {boolean} - New power state (true = on, false = off)
   */
  async toggleDevice(context) {
    try {
      const deviceInfo = this.devices.get(context);

      if (!deviceInfo) {
        console.log(`[${context}] Device not initialized`);
        this.showAlert(context);
        return null;
      }

      const { type, device } = deviceInfo;

      if (type === 'kasa') {
        // Get current state and toggle
        const sysInfo = await device.getSysInfo();
        const currentState = sysInfo.relay_state === 1;
        const newState = !currentState;

        await device.setPowerState(newState);
        console.log(`[${context}] Kasa device toggled to ${newState ? 'ON' : 'OFF'}`);
        return newState;
      } else if (type === 'tapo') {
        // Get current state and toggle
        const deviceInfo = await device.getDeviceInfo();
        const currentState = deviceInfo.device_on;
        const newState = !currentState;

        if (newState) {
          await device.turnOn();
        } else {
          await device.turnOff();
        }
        console.log(`[${context}] Tapo device toggled to ${newState ? 'ON' : 'OFF'}`);
        return newState;
      }

      return null;
    } catch (error) {
      console.error(`[${context}] Failed to toggle device:`, error.message);
      this.showAlert(context);
      return null;
    }
  }

  /**
   * Set device power state
   * @param {string} context - Stream Deck context identifier
   * @param {boolean} powerOn - Desired power state (true = on, false = off)
   * @returns {boolean} - Resulting power state
   */
  async setDeviceState(context, powerOn) {
    try {
      const deviceInfo = this.devices.get(context);

      if (!deviceInfo) {
        console.log(`[${context}] Device not initialized`);
        this.showAlert(context);
        return null;
      }

      const { type, device } = deviceInfo;

      if (type === 'kasa') {
        await device.setPowerState(powerOn);
        console.log(`[${context}] Kasa device set to ${powerOn ? 'ON' : 'OFF'}`);
        return powerOn;
      } else if (type === 'tapo') {
        if (powerOn) {
          await device.turnOn();
        } else {
          await device.turnOff();
        }
        console.log(`[${context}] Tapo device set to ${powerOn ? 'ON' : 'OFF'}`);
        return powerOn;
      }

      return null;
    } catch (error) {
      console.error(`[${context}] Failed to set device state:`, error.message);
      this.showAlert(context);
      return null;
    }
  }

  /**
   * Get current device power state
   * @param {string} context - Stream Deck context identifier
   * @returns {boolean|null} - Power state or null if unavailable
   */
  async getDeviceState(context) {
    try {
      const deviceInfo = this.devices.get(context);

      if (!deviceInfo) {
        return null;
      }

      const { type, device } = deviceInfo;

      if (type === 'kasa') {
        const sysInfo = await device.getSysInfo();
        return sysInfo.relay_state === 1;
      } else if (type === 'tapo') {
        const info = await device.getDeviceInfo();
        return info.device_on;
      }

      return null;
    } catch (error) {
      console.error(`[${context}] Failed to get device state:`, error.message);
      return null;
    }
  }

  /**
   * Remove device from manager
   * @param {string} context - Stream Deck context identifier
   */
  removeDevice(context) {
    this.devices.delete(context);
    console.log(`[${context}] Device removed from manager`);
  }

  /**
   * Show alert on Stream Deck key (yellow exclamation mark)
   * @param {string} context - Stream Deck context identifier
   */
  showAlert(context) {
    if (websocket) {
      websocket.send(JSON.stringify({
        event: 'showAlert',
        context: context
      }));
    }
  }

  /**
   * Update key state on Stream Deck
   * @param {string} context - Stream Deck context identifier
   * @param {boolean} state - Power state (true = on/state 1, false = off/state 0)
   */
  setState(context, state) {
    if (websocket) {
      websocket.send(JSON.stringify({
        event: 'setState',
        context: context,
        payload: {
          state: state ? 1 : 0
        }
      }));
    }
  }

  /**
   * Send data to Property Inspector
   * @param {string} context - Stream Deck context identifier
   * @param {object} payload - Data to send
   */
  sendToPropertyInspector(context, payload) {
    if (websocket) {
      websocket.send(JSON.stringify({
        event: 'sendToPropertyInspector',
        context: context,
        payload: payload
      }));
    }
  }
}

// Create device manager instance
const deviceManager = new DeviceManager();

/**
 * Stream Deck Plugin Entry Point
 * @param {string} inPort - WebSocket port
 * @param {string} inPluginUUID - Plugin UUID
 * @param {string} inRegisterEvent - Registration event name
 * @param {string} inInfo - Plugin info JSON string
 */
function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
  pluginUUID = inPluginUUID;

  // Create WebSocket connection to Stream Deck
  websocket = new WebSocket(`ws://127.0.0.1:${inPort}`);

  // Register plugin on connection
  websocket.onopen = () => {
    const registerJSON = {
      event: inRegisterEvent,
      uuid: inPluginUUID
    };
    websocket.send(JSON.stringify(registerJSON));
    console.log('Plugin connected to Stream Deck');
  };

  // Handle messages from Stream Deck
  websocket.onmessage = async (evt) => {
    try {
      const jsonObj = JSON.parse(evt.data);
      const event = jsonObj.event;
      const context = jsonObj.context;
      const settings = jsonObj.payload?.settings || {};

      console.log(`Received event: ${event}`);

      switch (event) {
        // Key pressed on Stream Deck
        case 'keyDown':
          await handleKeyDown(context, jsonObj.action, settings);
          break;

        // Action appears on Stream Deck (initialize device)
        case 'willAppear':
          await handleWillAppear(context, settings);
          break;

        // Action disappears from Stream Deck (cleanup)
        case 'willDisappear':
          deviceManager.removeDevice(context);
          break;

        // Settings changed in Property Inspector
        case 'didReceiveSettings':
          await handleWillAppear(context, settings);
          break;

        // Message from Property Inspector
        case 'sendToPlugin':
          await handleSendToPlugin(context, jsonObj.payload);
          break;

        default:
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  };

  websocket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  websocket.onclose = () => {
    console.log('WebSocket connection closed');
  };
}

/**
 * Handle keyDown event - Control device power based on action type
 * @param {string} context - Stream Deck context
 * @param {string} action - Action UUID (toggle, on, or off)
 * @param {object} settings - Device settings
 */
async function handleKeyDown(context, action, settings) {
  console.log(`[${context}] Key pressed for action: ${action}`);

  // Initialize device if not already done
  if (!deviceManager.devices.has(context)) {
    await deviceManager.initializeDevice(context, settings);
  }

  let newState = null;

  // Determine action based on UUID
  if (action === 'live.scetrov.tplink.toggle') {
    // Toggle device power
    newState = await deviceManager.toggleDevice(context);
  } else if (action === 'live.scetrov.tplink.on') {
    // Turn device on
    newState = await deviceManager.setDeviceState(context, true);
  } else if (action === 'live.scetrov.tplink.off') {
    // Turn device off
    newState = await deviceManager.setDeviceState(context, false);
  }

  // Update key visual state if action succeeded
  if (newState !== null) {
    deviceManager.setState(context, newState);
  }
}

/**
 * Handle willAppear event - Initialize device connection
 * @param {string} context - Stream Deck context
 * @param {object} settings - Device settings
 */
async function handleWillAppear(context, settings) {
  console.log(`[${context}] Action appeared with settings:`, settings);

  // Initialize device connection
  const device = await deviceManager.initializeDevice(context, settings);

  // Get and display current state
  if (device) {
    const state = await deviceManager.getDeviceState(context);
    if (state !== null) {
      deviceManager.setState(context, state);
    }
  }
}

/**
 * Handle sendToPlugin event - Process messages from Property Inspector
 * @param {string} context - Stream Deck context
 * @param {object} payload - Message payload
 */
async function handleSendToPlugin(context, payload) {
  console.log(`[${context}] Received from PI:`, payload);

  if (payload.action === 'discoverDevices') {
    console.log('Starting Kasa device discovery...');
    const devices = await deviceManager.discoverDevices();
    deviceManager.sendToPropertyInspector(context, {
      action: 'devicesDiscovered',
      devices: devices
    });
  } else if (payload.action === 'discoverTapoDevices') {
    console.log('Starting Tapo device discovery...');
    try {
      const devices = await deviceManager.discoverTapoDevices(
        payload.username,
        payload.password
      );
      deviceManager.sendToPropertyInspector(context, {
        action: 'tapoDevicesDiscovered',
        devices: devices,
        success: true
      });
    } catch (error) {
      deviceManager.sendToPropertyInspector(context, {
        action: 'tapoDevicesDiscovered',
        devices: [],
        success: false,
        error: error.message
      });
    }
  }
}

// Global WebSocket requirement for Stream Deck SDK
global.WebSocket = require('ws');

// Export the entry point function
module.exports = { connectElgatoStreamDeckSocket };
