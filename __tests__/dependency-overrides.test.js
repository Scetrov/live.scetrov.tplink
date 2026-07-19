const { createRequire } = require("module");

describe("security dependency overrides", () => {
  test("Tapo client remains compatible with patched axios and uuid", () => {
    const tapoRequire = createRequire(
      require.resolve("tp-link-tapo-connect/package.json"),
    );
    const axios = tapoRequire("axios");
    const uuid = tapoRequire("uuid");

    expect(typeof axios).toBe("function");
    expect(typeof axios.create).toBe("function");
    expect(typeof uuid.v4).toBe("function");
  });

  test("local device discovery dependencies retain their expected APIs", () => {
    const localRequire = createRequire(
      require.resolve("local-devices/package.json"),
    );
    const ip = localRequire("ip");
    const { getIPRange } = localRequire("get-ip-range");

    expect(ip.fromLong(ip.toLong("192.168.1.1"))).toBe("192.168.1.1");
    expect(ip.isPrivate("127.1")).toBe(true);
    expect(getIPRange("192.168.1.1", "192.168.1.3")).toEqual([
      "192.168.1.1",
      "192.168.1.2",
      "192.168.1.3",
    ]);
    expect(getIPRange("::1", "::3")).toEqual(["::1", "::2", "::3"]);
  });
});
