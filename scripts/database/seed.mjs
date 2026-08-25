import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { assertDevelopmentDatabase, migrationDatabaseUrl } from "./config.mjs";

const url = await migrationDatabaseUrl();
assertDevelopmentDatabase(url);
const client = new pg.Client({ connectionString: url, application_name: "tcms-dev-seed" });
await client.connect();
try {
  await client.query(await readFile(resolve("database/seeds/001_dev_seed.sql"), "utf8"));
  console.log("Seed dữ liệu giả DEV hoàn tất.");
} finally { await client.end(); }
