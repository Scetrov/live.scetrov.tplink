describe("secure Tapo client dependencies", () => {
  test("vendored client retains the plugin API", () => {
    const tapo = require("../lib/tapo/api");

    expect(typeof tapo.loginDeviceByIp).toBe("function");
    expect(typeof tapo.cloudLogin).toBe("function");
  });

  test("client dependencies retain their expected CommonJS APIs", () => {
    const axios = require("axios");
    const { randomUUID } = require("crypto");

    expect(typeof axios).toBe("function");
    expect(typeof axios.create).toBe("function");
    expect(typeof randomUUID).toBe("function");
  });
});
