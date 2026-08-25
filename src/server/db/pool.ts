import "server-only";

import { Pool } from "pg";
import { requiredSecret } from "../config/secrets";

const globalForPg = globalThis as unknown as { tcmsPool?: Pool };

export function getPool() {
  if (!globalForPg.tcmsPool) {
    globalForPg.tcmsPool = new Pool({
      connectionString: requiredSecret("DATABASE_URL"),
      application_name: "tcms-api",
      max: Number(process.env.TCMS_DB_POOL_MAX ?? 10),
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      statement_timeout: 15_000,
      ssl: process.env.TCMS_DB_SSL === "disable" ? false : { rejectUnauthorized: true },
    });
    globalForPg.tcmsPool.on("error", (error) => console.error("PostgreSQL idle client error", error.message));
  }
  return globalForPg.tcmsPool;
}
