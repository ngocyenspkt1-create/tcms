import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const FORMAT_VERSION = 1;
const KEY_VERSION = 1;

function key() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Bộ mã hóa bằng tệp chỉ dành cho DEV/TEST; production phải tích hợp Vault/KMS/HSM.");
  }
  const path = process.env.TCMS_FIELD_ENCRYPTION_KEY_FILE?.trim();
  if (!path) throw new Error("Thiếu TCMS_FIELD_ENCRYPTION_KEY_FILE.");
  const decoded = Buffer.from(readFileSync(path, "utf8").trim(), "base64");
  if (decoded.length !== 32) throw new Error("Khóa DEV phải là 32 byte, mã hóa Base64.");
  return decoded;
}

export function encryptJson(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return {
    ciphertext: Buffer.concat([Buffer.from([FORMAT_VERSION]), iv, cipher.getAuthTag(), ciphertext]),
    keyVersion: KEY_VERSION,
  };
}

export function decryptJson<T>(payload: Buffer | null): T | undefined {
  if (!payload) return undefined;
  if (payload[0] !== FORMAT_VERSION || payload.length < 30) throw new Error("Dữ liệu mã hóa không hợp lệ.");
  const decipher = createDecipheriv("aes-256-gcm", key(), payload.subarray(1, 13));
  decipher.setAuthTag(payload.subarray(13, 29));
  const plaintext = Buffer.concat([decipher.update(payload.subarray(29)), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}
