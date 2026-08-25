import { readFile } from "node:fs/promises";

export async function databaseUrl() {
  if (process.env.DATABASE_URL?.trim()) return process.env.DATABASE_URL.trim();
  if (process.env.DATABASE_URL_FILE?.trim()) return (await readFile(process.env.DATABASE_URL_FILE.trim(), "utf8")).trim();
  throw new Error("Thiếu DATABASE_URL hoặc DATABASE_URL_FILE trong .env.local.");
}

export async function migrationDatabaseUrl() {
  if (process.env.MIGRATION_DATABASE_URL?.trim()) return process.env.MIGRATION_DATABASE_URL.trim();
  if (process.env.MIGRATION_DATABASE_URL_FILE?.trim()) return (await readFile(process.env.MIGRATION_DATABASE_URL_FILE.trim(), "utf8")).trim();
  throw new Error("Thiếu MIGRATION_DATABASE_URL hoặc MIGRATION_DATABASE_URL_FILE trong .env.local.");
}

export function assertDevelopmentDatabase(url) {
  if (process.env.NODE_ENV === "production") throw new Error("Các script database DEV không được chạy với NODE_ENV=production.");
  const parsed = new URL(url);
  if (!/(_dev|_test)$/.test(parsed.pathname.slice(1))) {
    throw new Error("Tên database phải kết thúc bằng _dev hoặc _test để tránh thao tác nhầm môi trường.");
  }
}
