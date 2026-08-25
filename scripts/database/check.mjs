import pg from "pg";
import { databaseUrl } from "./config.mjs";

const client = new pg.Client({ connectionString: await databaseUrl(), application_name: "tcms-dev-check", connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  const result = await client.query("SELECT current_database() database, version(), clock_timestamp() checked_at");
  const migrations = await client.query("SELECT version, applied_at FROM tcms.schema_migrations ORDER BY version");
  console.log({ database: result.rows[0].database, checkedAt: result.rows[0].checked_at, migrations: migrations.rows });
} finally { await client.end(); }
