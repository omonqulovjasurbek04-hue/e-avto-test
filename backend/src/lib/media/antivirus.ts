import fs from "fs";
import net from "net";
import { env } from "../../config/env";

export type ScanResult = { status: "clean" } | { status: "infected"; signature: string } | { status: "skipped" };

export class ScannerUnavailableError extends Error {}

export const antivirusEnabled = () => Boolean(env.CLAMAV_HOST);

/**
 * Scans a file with clamd over TCP (INSTREAM protocol). Without CLAMAV_HOST nothing is scanned
 * ("skipped"). When a scanner is configured but cannot be reached, the upload must be rejected —
 * the caller treats ScannerUnavailableError as "do not store".
 */
export const scanFile = (filePath: string, opts: { host?: string; port?: number; timeoutMs?: number } = {}): Promise<ScanResult> => {
  const host = opts.host ?? env.CLAMAV_HOST;
  const port = opts.port ?? env.CLAMAV_PORT;
  if (!host) return Promise.resolve({ status: "skipped" });

  return new Promise((resolve, reject) => {
    let reply = "";
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      fn();
    };
    const fail = (msg: string) => done(() => reject(new ScannerUnavailableError(msg)));

    const socket = net.createConnection({ host, port });
    socket.setTimeout(opts.timeoutMs ?? env.CLAMAV_TIMEOUT_MS, () => fail("Antivirus scan timed out"));
    socket.on("error", (err) => fail(`Antivirus unavailable: ${err.message}`));
    const evaluate = () => {
      const text = reply.replace(/\0/g, "").trim();
      if (/^stream: OK$/.test(text)) return done(() => resolve({ status: "clean" }));
      const found = /^stream: (.+) FOUND$/.exec(text);
      if (found) return done(() => resolve({ status: "infected", signature: found[1] }));
      fail(`Unexpected antivirus reply: ${text.slice(0, 120)}`);
    };
    // The reply is one NUL-terminated line ("z" command prefix); clamd then closes the connection.
    socket.on("data", (chunk) => {
      reply += chunk.toString("utf8");
      if (reply.includes("\0")) evaluate();
    });
    socket.on("end", evaluate);

    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      const file = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });
      file.on("data", (data) => {
        const buf = data as Buffer;
        const len = Buffer.alloc(4);
        len.writeUInt32BE(buf.length, 0);
        if (!socket.write(Buffer.concat([len, buf]))) {
          file.pause();
          socket.once("drain", () => file.resume());
        }
      });
      file.on("end", () => socket.write(Buffer.from([0, 0, 0, 0])));
      file.on("error", (err) => fail(`Cannot read upload: ${err.message}`));
    });
  });
};
