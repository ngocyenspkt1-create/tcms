import pg from "pg";
import { assertDevelopmentDatabase, databaseUrl, migrationDatabaseUrl } from "./config.mjs";

const targetUrl = await databaseUrl();
assertDevelopmentDatabase(targetUrl);
if (!process.env.POSTGRES_ADMIN_URL?.trim()) throw new Error("Thiếu POSTGRES_ADMIN_URL trong .env.local để tạo database lần đầu.");
const target = new URL(targetUrl);
const migration = new URL(await migrationDatabaseUrl());
const databaseName = target.pathname.slice(1);
if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) throw new Error("Tên database không hợp lệ.");
const client = new pg.Client({ connectionString: process.env.POSTGRES_ADMIN_URL.trim(), application_name: "tcms-dev-create" });
await client.connect();
try {
  for (const [roleUrl, isMigrationOwner] of [[migration, true], [target, false]]) {
    const username = decodeURIComponent(roleUrl.username);
    const password = decodeURIComponent(roleUrl.password);
    if (!username || !password) throw new Error("URL database DEV phải có username và password.");
    const quoted = await client.query("SELECT quote_ident($1) ident, quote_literal($2) password", [username, password]);
    const exists = await client.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [username]);
    if (!exists.rowCount) await client.query(`CREATE ROLE ${quoted.rows[0].ident} LOGIN ${isMigrationOwner ? "CREATEROLE" : "NOCREATEROLE"} PASSWORD ${quoted.rows[0].password}`);
    else if (isMigrationOwner) await client.query(`ALTER ROLE ${quoted.rows[0].ident} CREATEROLE`);
  }
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname=$1", [databaseName]);
  if (exists.rowCount) console.log(`Database ${databaseName} đã tồn tại.`);
  else {
    const quoted = await client.query("SELECT quote_ident($1) database, quote_ident($2) owner", [databaseName, decodeURIComponent(migration.username)]);
    await client.query(`CREATE DATABASE ${quoted.rows[0].database} OWNER ${quoted.rows[0].owner}`);
    console.log(`Đã tạo database ${databaseName}.`);
  }
} finally { await client.end(); }
