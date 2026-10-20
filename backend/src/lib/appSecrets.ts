import crypto from "crypto";
import { prisma } from "../config/database";
import { env } from "../config/env";

/**
 * JWT_SECRET_FROM_DB=true: the signing secret is created once (random, 48 bytes) and kept in the database,
 * so a hosting setup needs no hand-made secret. Anyone who can read the database could forge tokens, but
 * such access already means full control of the data. An explicit JWT_SECRET always wins.
 */
export async function loadJwtSecretFromDb(): Promise<void> {
  if (!env.JWT_SECRET_FROM_DB) return;
  // Several instances may start together: the first insert wins, everyone reads the same row.
  await prisma.appSecret.createMany({ data: [{ key: "jwt_secret", value: crypto.randomBytes(48).toString("hex") }], skipDuplicates: true });
  const row = await prisma.appSecret.findUniqueOrThrow({ where: { key: "jwt_secret" } });
  env.JWT_SECRET = row.value;
}
