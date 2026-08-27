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

export async function maintenanceDatabaseUrl() {
  if (process.env.BACKUP_DATABASE_URL?.trim()) return process.env.BACKUP_DATABASE_URL.trim();
  if (process.env.BACKUP_DATABASE_URL_FILE?.trim()) {
    return (await readFile(process.env.BACKUP_DATABASE_URL_FILE.trim(), "utf8")).trim();
  }

  // Backward-compatible DEV fallback: use the existing bootstrap administrator,
  // but connect it to the actual *_dev/_test database instead of postgres.
  if (process.env.POSTGRES_ADMIN_URL?.trim()) {
    const admin = new URL(process.env.POSTGRES_ADMIN_URL.trim());
    const target = new URL(await migrationDatabaseUrl());
    admin.pathname = target.pathname;
    admin.search = target.search;
    return admin.toString();
  }

  throw new Error(
    "Thiếu BACKUP_DATABASE_URL_FILE/BACKUP_DATABASE_URL hoặc POSTGRES_ADMIN_URL trong .env.local.",
  );
}

export function assertDevelopmentDatabase(url) {
  if (process.env.NODE_ENV === "production") throw new Error("Các script database DEV không được chạy với NODE_ENV=production.");
  const parsed = new URL(url);
  if (!/(_dev|_test)$/.test(parsed.pathname.slice(1))) {
    throw new Error("Tên database phải kết thúc bằng _dev hoặc _test để tránh thao tác nhầm môi trường.");
  }
}
