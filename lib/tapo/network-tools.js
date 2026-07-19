"use strict";

const { parse } = require("macaddr");
const arpModule = require("@network-utils/arp-lookup");
const arp = arpModule.default || arpModule;

async function resolveMacToIp(mac) {
  const normalizedMac = parse(mac).toString();

  for (let attempt = 0; attempt < 6; attempt++) {
    const ip = await arp.toIP(normalizedMac);
    if (ip) return ip;
  }

  return null;
}

module.exports = { resolveMacToIp };
