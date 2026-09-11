import pg from "pg";
import { assertDevelopmentDatabase, databaseUrl } from "./config.mjs";

const url = await databaseUrl();
assertDevelopmentDatabase(url);
const client = new pg.Client({ connectionString:url, application_name:"tcms-verify-personnel" });
const marker = `verify-personnel-${Date.now()}`;
let unauthorizedWriteBlocked = false;
let lastAdminProtected = false;

async function context(permissions) {
  const settings = [
    ["app.actor_id","00000000-0000-0000-0000-000000000001"],
    ["app.permissions",JSON.stringify(permissions)],
    ["app.department_ids","[]"],["app.assigned_contract_ids","[]"],
    ["app.global_contract_scope","true"],["app.environment","development"],
    ["app.correlation_id",crypto.randomUUID()],["app.app_version","personnel-verifier"],
  ];
  for (const [name,value] of settings) await client.query("SELECT set_config($1,$2,true)",[name,value]);
}

await client.connect();
try {
  await client.query("BEGIN");
  await context(["contract.read","audit.write"]);
  await client.query("SAVEPOINT unauthorized_write");
  try {
    await client.query(
      "INSERT INTO tcms.app_users(identity_subject,username,display_name) VALUES($1,$2,$3)",
      [marker,`${marker}@tcms.dev`,"Kiểm thử không quyền"],
    );
  } catch {
    unauthorizedWriteBlocked = true;
    await client.query("ROLLBACK TO SAVEPOINT unauthorized_write");
  }

  await context(["user.manage","role.manage","audit.write","audit.read.security"]);
  const department = await client.query("SELECT id FROM tcms.departments WHERE active ORDER BY code LIMIT 1");
  const created = await client.query(
    `INSERT INTO tcms.app_users(identity_subject,username,display_name,primary_department_id)
     VALUES($1,$2,$3,$4) RETURNING id,version`,
    [marker,`${marker}@tcms.dev`,"Nhân sự kiểm thử",department.rows[0].id],
  );
  await client.query(
    `INSERT INTO tcms.user_role_scopes(user_id,role_code,department_id,granted_by)
     VALUES($1,'VIEWER',$2,$3)`,
    [created.rows[0].id,department.rows[0].id,"personnel-verifier"],
  );
  const updated = await client.query(
    "UPDATE tcms.app_users SET display_name=$1 WHERE id=$2 AND version=$3 RETURNING version",
    ["Nhân sự kiểm thử cập nhật",created.rows[0].id,created.rows[0].version],
  );
  const staleUpdate = await client.query(
    "UPDATE tcms.app_users SET display_name=$1 WHERE id=$2 AND version=$3 RETURNING version",
    ["Không được ghi đè",created.rows[0].id,created.rows[0].version],
  );
  const audit = await client.query(
    "SELECT count(*)::int count FROM tcms.audit_events WHERE resource_id=$1 OR (resource_type='user_role_scopes' AND after_data->>'user_id'=$1)",
    [created.rows[0].id],
  );

  await client.query("SAVEPOINT last_admin");
  try {
    await client.query(
      `DELETE FROM tcms.user_role_scopes WHERE user_id='00000000-0000-0000-0000-000000000001'::uuid
       AND role_code='SYSTEM_ADMIN' AND global_scope`,
    );
  } catch (error) {
    lastAdminProtected = error instanceof Error && error.message.includes("LAST_GLOBAL_SYSTEM_ADMIN_REQUIRED");
    await client.query("ROLLBACK TO SAVEPOINT last_admin");
  }
  await client.query("ROLLBACK");

  await client.query("BEGIN");
  await context(["user.manage","role.manage","audit.write"]);
  const residual = await client.query("SELECT count(*)::int count FROM tcms.app_users WHERE identity_subject=$1",[marker]);
  await client.query("ROLLBACK");

  const result = {
    unauthorizedWriteBlocked,
    createVersion:created.rows[0].version,
    updateVersion:updated.rows[0].version,
    staleUpdateRows:staleUpdate.rowCount,
    auditEventsInsideTransaction:audit.rows[0].count,
    lastAdminProtected,
    residualRows:residual.rows[0].count,
  };
  if (!unauthorizedWriteBlocked || result.createVersion!==1 || result.updateVersion!==2 || result.staleUpdateRows!==0 || result.auditEventsInsideTransaction<3 || !lastAdminProtected || result.residualRows!==0) {
    throw new Error("PERSONNEL_MANAGEMENT_VERIFICATION_FAILED");
  }
  console.log(JSON.stringify(result,null,2));
} finally {
  await client.query("ROLLBACK").catch(()=>undefined);
  await client.end();
}
