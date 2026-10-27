import { describe, expect, it } from "vitest";
import { inspectImageBytes } from "../src/lib/media/imageSafety";

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const text = (s: string) => Buffer.from(s, "latin1");
const join = (...parts: Buffer[]) => Buffer.concat(parts);
// The end of a ZIP archive ("end of central directory" record), as found at the end of any .zip/.docx/.apk.
const ZIP_END = join(text("PK\x05\x06"), Buffer.alloc(18));
const EXE = join(text("MZ"), Buffer.alloc(62), text("This program cannot be run in DOS mode.\r\n"), Buffer.alloc(200));

describe("hidden code in pictures", () => {
  it("passes clean pictures", () => {
    expect(inspectImageBytes(PNG)).toEqual([]);
    expect(inspectImageBytes(text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle r="4" fill="red"/></svg>'))).toEqual([]);
  });

  it("does not raise false alarms on random binary data", () => {
    // Deterministic pseudo-random bytes, like the compressed body of a large photo.
    let seed = 42;
    const noise = Buffer.alloc(3 * 1024 * 1024).map(() => ((seed = (seed * 1103515245 + 12345) >>> 0) >>> 24) & 0xff);
    expect(inspectImageBytes(join(PNG.subarray(0, 33), noise, PNG.subarray(33)))).toEqual([]);
  });

  it("finds a program or archive disguised as a picture", () => {
    expect(inspectImageBytes(EXE)).toContain("executable");
    expect(inspectImageBytes(join(text("\x7fELF"), Buffer.alloc(60)))).toContain("linuxProgram");
    expect(inspectImageBytes(join(text("PK\x03\x04"), Buffer.alloc(60)))).toContain("archive");
    expect(inspectImageBytes(text("%PDF-1.7\n..."))).toContain("pdf");
    expect(inspectImageBytes(text("<!DOCTYPE html><html><body>hi</body></html>"))).toContain("html");
    expect(inspectImageBytes(text("#!/bin/sh\nrm -rf /"))).toContain("shellScript");
  });

  it("finds code written into a real picture", () => {
    expect(inspectImageBytes(join(PNG, text("<?php system($_GET['c']); ?>")))).toContain("php");
    expect(inspectImageBytes(join(PNG, text("<script>fetch('//evil')</script>")))).toContain("script");
  });

  it("finds a file glued onto the end of a picture", () => {
    expect(inspectImageBytes(join(PNG, Buffer.alloc(100), ZIP_END))).toContain("hiddenFile");
    expect(inspectImageBytes(join(PNG, EXE))).toEqual(expect.arrayContaining(["executable", "hiddenFile"]));
  });

  it("finds active content in SVG", () => {
    const svg = (inner: string) => text(`<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`);
    expect(inspectImageBytes(svg('<rect onload="alert(1)"/>'))).toContain("svgEvents");
    expect(inspectImageBytes(svg('<a href="javascript:alert(1)"><text>x</text></a>'))).toContain("svgJsLink");
    expect(inspectImageBytes(svg("<foreignObject><div>x</div></foreignObject>"))).toContain("svgForeign");
    expect(inspectImageBytes(text('<?xml version="1.0"?><!DOCTYPE s [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg>&x;</svg>'))).toContain("svgEntity");
    expect(inspectImageBytes(svg('<image href="https://evil.example/track.png"/>'))).toContain("svgExternal");
    expect(inspectImageBytes(svg("<script>alert(1)</script>"))).toContain("script");
  });
});
