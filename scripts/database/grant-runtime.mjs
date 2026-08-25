import pg from "pg";
import { databaseUrl } from "./config.mjs";

if (!process.env.POSTGRES_ADMIN_URL?.trim()) throw new Error("Thiếu POSTGRES_ADMIN_URL.");
const runtime = new URL(await databaseUrl());
const username = decodeURIComponent(runtime.username);
const client = new pg.Client({ connectionString: process.env.POSTGRES_ADMIN_URL.trim(), application_name: "tcms-dev-grant" });
await client.connect();
try {
  const quoted = await client.query("SELECT quote_ident($1) AS role", [username]);
  await client.query(`GRANT tcms_app_runtime TO ${quoted.rows[0].role}`);
  console.log(`Đã cấp tcms_app_runtime cho ${username}.`);
} finally { await client.end(); }
