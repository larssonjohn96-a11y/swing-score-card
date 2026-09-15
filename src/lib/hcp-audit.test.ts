import { describe, expect, it } from "vitest";
import { auditHcpPair } from "./hcp-audit";

describe("HCP migration audit thresholds", () => {
  it("accepts <= 0.5 HCP", () => expect(auditHcpPair(10, 10.5).disposition).toBe("acceptable"));
  it("requires review above 0.5 through 1.5", () => expect(auditHcpPair(10, 11.2).disposition).toBe("review"));
  it("blocks migration above 1.5", () => expect(auditHcpPair(10, 11.6).disposition).toBe("blocking"));
});
