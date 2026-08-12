import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("managed application title", () => {
  it("keeps the configured title aligned with BizPilot runtime metadata", () => {
    expect(process.env.VITE_APP_TITLE).toBe("BizPilot");

    const indexHtml = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    expect(indexHtml).toContain("<title>BizPilot</title>");
  });
});
