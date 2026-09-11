import pg from "pg";
import { assertDevelopmentDatabase, databaseUrl } from "./config.mjs";

const url = await databaseUrl();
assertDevelopmentDatabase(url);
const client = new pg.Client({ connectionString: url, application_name: "tcms-verify-documents" });
const marker = `VERIFY-DOC-${Date.now()}`;
const actorId = "00000000-0000-0000-0000-000000000002";
let unauthorized = false;
let immutable = false;
let scanPermissionRequired = false;

async function context(permissions) {
  const settings = [
    ["app.actor_id", actorId],
    ["app.permissions", JSON.stringify(permissions)],
    ["app.department_ids", "[]"],
    ["app.assigned_contract_ids", "[]"],
    ["app.global_contract_scope", "true"],
    ["app.environment", "development"],
    ["app.correlation_id", crypto.randomUUID()],
    ["app.app_version", "document-verifier"],
  ];
  for (const [name, value] of settings) {
    await client.query("SELECT set_config($1,$2,true)", [name, value]);
  }
}

await client.connect();
try {
  await client.query("BEGIN");
  await context(["contract.read", "document.read", "audit.write"]);
  const contract = (
    await client.query("SELECT id FROM tcms.contracts WHERE archived_at IS NULL ORDER BY created_at LIMIT 1")
  ).rows[0];
  if (!contract) throw new Error("DEV contract fixture is required");

  const values = [
    contract.id,
    `${marker}.pdf`,
    "application/pdf",
    128,
    "a".repeat(64),
    marker,
    "TECHNICAL",
    "HS-VERIFY",
    actorId,
  ];
  const insertSql = `INSERT INTO tcms.documents(
    contract_id,display_name,media_type,size_bytes,sha256_hex,storage_object_id,
    malware_scan_status,document_type,reference_number,uploaded_by
  ) VALUES($1,$2,$3,$4,$5,$6,'PENDING',$7,$8,$9) RETURNING id`;

  await client.query("SAVEPOINT unauthorized");
  try {
    await client.query(insertSql, values);
  } catch {
    unauthorized = true;
    await client.query("ROLLBACK TO SAVEPOINT unauthorized");
  }

  await context(["contract.read", "document.read", "document.upload", "document.archive", "audit.write"]);
  const created = (await client.query(insertSql, values)).rows[0];
  const ownPendingVisible = (
    await client.query("SELECT count(*)::int count FROM tcms.documents WHERE id=$1", [created.id])
  ).rows[0].count;

  await client.query("SAVEPOINT immutable");
  try {
    await client.query("UPDATE tcms.documents SET display_name='changed.pdf' WHERE id=$1", [created.id]);
  } catch {
    immutable = true;
    await client.query("ROLLBACK TO SAVEPOINT immutable");
  }

  await client.query("SAVEPOINT scan_permission");
  try {
    await client.query(
      "UPDATE tcms.documents SET malware_scan_status='CLEAN',malware_scanned_at=clock_timestamp() WHERE id=$1",
      [created.id]
    );
  } catch {
    scanPermissionRequired = true;
    await client.query("ROLLBACK TO SAVEPOINT scan_permission");
  }

  await context(["contract.read", "document.read", "document.upload", "document.scan.update", "audit.write"]);
  const cleaned = await client.query(
    "UPDATE tcms.documents SET malware_scan_status='CLEAN',malware_scanned_at=clock_timestamp() WHERE id=$1 RETURNING malware_scan_status",
    [created.id]
  );
  await context([
    "contract.read",
    "document.read",
    "document.upload",
    "document.scan.update",
    "audit.write",
    "audit.read.business",
  ]);
  const auditEvents = (
    await client.query(
      "SELECT count(*)::int count FROM tcms.audit_events WHERE resource_type='documents' AND resource_id=$1",
      [created.id]
    )
  ).rows[0].count;

  await client.query("ROLLBACK");
  await client.query("BEGIN");
  await context(["contract.read", "document.read", "document.upload", "audit.write"]);
  const residualRows = (
    await client.query("SELECT count(*)::int count FROM tcms.documents WHERE storage_object_id=$1", [marker])
  ).rows[0].count;
  await client.query("ROLLBACK");

  const result = {
    unauthorized,
    ownPendingVisible,
    immutable,
    scanPermissionRequired,
    cleanedStatus: cleaned.rows[0]?.malware_scan_status,
    auditEventsInsideTransaction: auditEvents,
    residualRows,
  };
  console.log(JSON.stringify(result, null, 2));
  if (
    !unauthorized ||
    ownPendingVisible !== 1 ||
    !immutable ||
    !scanPermissionRequired ||
    cleaned.rows[0]?.malware_scan_status !== "CLEAN" ||
    auditEvents !== 2 ||
    residualRows !== 0
  ) {
    throw new Error("DOCUMENT_VERIFICATION_FAILED");
  }
} finally {
  await client.query("ROLLBACK").catch(() => undefined);
  await client.end();
}
