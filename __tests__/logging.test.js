const { sanitizeLogValue } = require("../plugin");

describe("log sanitization", () => {
  test("removes line breaks that could forge log entries", () => {
    expect(sanitizeLogValue("button-1\r\nforged entry")).toBe(
      "button-1forged entry",
    );
  });

  test("normalizes non-string values", () => {
    expect(sanitizeLogValue(null)).toBe("");
    expect(sanitizeLogValue(42)).toBe("42");
  });
});
