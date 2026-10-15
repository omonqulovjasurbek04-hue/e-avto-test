import { describe, expect, it } from "vitest";
import { signMediaToken, verifyMediaToken } from "../src/lib/media/signing";
import { detectType } from "../src/lib/media/sniff";

const SECRET = "media-test-secret";
const claims = { kind: "VIDEO" as const, assetId: "a1", userId: "u1", exp: 2_000 };

describe("media tokens", () => {
  it("verifies a fresh token", () => {
    expect(verifyMediaToken(SECRET, signMediaToken(SECRET, claims), 1_000)).toEqual(claims);
  });
  it("rejects expired tokens", () => {
    expect(verifyMediaToken(SECRET, signMediaToken(SECRET, claims), 2_000)).toBeNull();
  });
  it("rejects a token signed with another secret or with a modified payload", () => {
    expect(verifyMediaToken(SECRET, signMediaToken("other", claims), 1_000)).toBeNull();
    const [, sig] = signMediaToken(SECRET, claims).split(".");
    const forged = Buffer.from(JSON.stringify({ ...claims, assetId: "a2" })).toString("base64url");
    expect(verifyMediaToken(SECRET, `${forged}.${sig}`, 1_000)).toBeNull();
  });
  it("rejects malformed input", () => {
    for (const t of ["", "abc", "a.b.c", "."]) expect(verifyMediaToken(SECRET, t, 1)).toBeNull();
  });
});

describe("detectType", () => {
  it("recognises allowed formats by signature", () => {
    expect(detectType(Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]))?.mime).toBe("video/mp4");
    expect(detectType(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0]))?.mime).toBe("video/webm");
    expect(detectType(Buffer.from("%PDF-1.7\n"))?.mime).toBe("application/pdf");
    expect(detectType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mime).toBe("image/png");
    expect(detectType(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
  });
  it("rejects scripts, HTML and executables regardless of name", () => {
    expect(detectType(Buffer.from("<html><script>alert(1)</script>"))).toBeNull();
    expect(detectType(Buffer.from("MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00"))).toBeNull();
    expect(detectType(Buffer.alloc(0))).toBeNull();
  });
});
