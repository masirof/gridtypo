import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("adds numbers1", () => {
    expect(1 + 2).toBe(3);
  });
  it("adds numbers2", () => {
    expect(1 + 5).toBe(6);
  });
  it("adds numbers3", () => {
    expect(1 + 6).toBe(7);
  });
});
