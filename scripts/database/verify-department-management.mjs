import pg from "pg";
import { assertDevelopmentDatabase, databaseUrl } from "./config.mjs";

const url = await databaseUrl();
assertDevelopmentDatabase(url);
const client = new pg.Client({ connectionString: url, application_name: "tcms-verify-departments" });
const marker = `VERIFY-DEPT-${Date.now()}`;
let unauthorizedWriteBlocked = false;

async function context(permissions) {
  const settings = [
    ["app.actor_id", "00000000-0000-0000-0000-000000000001"],
    ["app.permissions", JSON.stringify(permissions)],
    ["app.department_ids", "[]"], ["app.assigned_contract_ids", "[]"],
    ["app.global_contract_scope", "true"], ["app.environment", "development"],
    ["app.correlation_id", crypto.randomUUID()], ["app.app_version", "department-verifier"],
  ];
  for (const [name, value] of settings) await client.query("SELECT set_config($1,$2,true)", [name, value]);
}

await client.connect();
try {
  await client.query("BEGIN");
  await context(["contract.read", "audit.write"]);
  await client.query("SAVEPOINT unauthorized_write");
  try {
    await client.query("INSERT INTO tcms.departments (code,name) VALUES ($1,$2)", [marker, "Unauthorized"]);
  } catch {
    unauthorizedWriteBlocked = true;
    await client.query("ROLLBACK TO SAVEPOINT unauthorized_write");
  }

  await context(["contract.read", "system.configure", "audit.write", "audit.read.business"]);
  const created = await client.query("INSERT INTO tcms.departments (code,name) VALUES ($1,$2) RETURNING id,version", [marker, "Đơn vị kiểm thử"]);
  const updated = await client.query("UPDATE tcms.departments SET name=$1 WHERE id=$2 AND version=$3 RETURNING version", ["Đơn vị kiểm thử cập nhật", created.rows[0].id, created.rows[0].version]);
  const audit = await client.query("SELECT count(*)::int AS count FROM tcms.audit_events WHERE resource_type='departments' AND resource_id=$1", [created.rows[0].id]);
  await client.query("ROLLBACK");

  await client.query("BEGIN");
  await context(["contract.read", "system.configure", "audit.write"]);
  const residual = await client.query("SELECT count(*)::int AS count FROM tcms.departments WHERE code=$1", [marker]);
  await client.query("ROLLBACK");

  const result = {
    unauthorizedWriteBlocked,
    createVersion: created.rows[0].version,
    updateVersion: updated.rows[0].version,
    auditEventsInsideTransaction: audit.rows[0].count,
    residualRows: residual.rows[0].count,
  };
  if (!unauthorizedWriteBlocked || result.createVersion !== 1 || result.updateVersion !== 2 || result.auditEventsInsideTransaction !== 2 || result.residualRows !== 0) {
    throw new Error("DEPARTMENT_MANAGEMENT_VERIFICATION_FAILED");
  }
  console.log(JSON.stringify(result, null, 2));
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  await client.end();
}
