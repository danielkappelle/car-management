import { describe, expect, it } from "vitest";
import { parseDecimal } from "./number.js";

describe("parseDecimal", () => {
  it.each([
    ["42,37", 42.37],
    ["42.37", 42.37],
    [" 12 ", 12],
    ["0,5", 0.5],
    [",5", 0.5],
    ["12,", 12],
  ])("parses %j", (input, expected) => {
    expect(parseDecimal(input)).toBe(expected);
  });

  it.each(["", "abc", "1,2,3", "1.234,56", "-5", "1e3"])("rejects %j", (input) => {
    expect(parseDecimal(input)).toBeNull();
  });
});
