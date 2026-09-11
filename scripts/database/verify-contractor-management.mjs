import pg from "pg";
import { assertDevelopmentDatabase,databaseUrl } from "./config.mjs";

const url=await databaseUrl(); assertDevelopmentDatabase(url);
const client=new pg.Client({connectionString:url,application_name:"tcms-verify-contractors"});
const marker=`VERIFY-NT-${Date.now()}`; let unauthorizedWriteBlocked=false;

async function context(permissions){
  const settings=[["app.actor_id","00000000-0000-0000-0000-000000000002"],["app.permissions",JSON.stringify(permissions)],
    ["app.department_ids","[]"],["app.assigned_contract_ids","[]"],["app.global_contract_scope","true"],
    ["app.environment","development"],["app.correlation_id",crypto.randomUUID()],["app.app_version","contractor-verifier"]];
  for(const [name,value] of settings)await client.query("SELECT set_config($1,$2,true)",[name,value]);
}

await client.connect();
try{
  await client.query("BEGIN"); await context(["contract.read","audit.write"]); await client.query("SAVEPOINT unauthorized_write");
  try{await client.query("INSERT INTO tcms.contractors(code,name,created_by,updated_by) VALUES($1,$2,$3,$3)",[marker,"Không quyền","verifier"]);}catch{unauthorizedWriteBlocked=true;await client.query("ROLLBACK TO SAVEPOINT unauthorized_write");}
  await context(["contract.read","contract.identity.update","audit.write","audit.read.business"]);
  const created=await client.query(`INSERT INTO tcms.contractors(code,name,tax_code,sensitive_ciphertext,sensitive_key_version,created_by,updated_by)
    VALUES($1,$2,$3,convert_to($4,'UTF8'),1,$5,$5) RETURNING id,version`,[marker,"Nhà thầu kiểm thử",`${Date.now()}`,"encrypted-test-payload","verifier"]);
  const updated=await client.query("UPDATE tcms.contractors SET name=$1 WHERE id=$2 AND version=$3 RETURNING version",["Nhà thầu kiểm thử cập nhật",created.rows[0].id,created.rows[0].version]);
  const stale=await client.query("UPDATE tcms.contractors SET name=$1 WHERE id=$2 AND version=$3 RETURNING version",["Không ghi đè",created.rows[0].id,created.rows[0].version]);
  const audit=await client.query(`SELECT count(*)::int count,
    bool_and(NOT(before_data?'sensitive_ciphertext') AND NOT(after_data?'sensitive_ciphertext')) redacted
    FROM tcms.audit_events WHERE resource_type='contractors' AND resource_id=$1`,[created.rows[0].id]);
  const linked=await client.query("SELECT count(*)::int count FROM tcms.contracts WHERE archived_at IS NULL AND contractor_id IS NULL");
  await client.query("ROLLBACK");
  await client.query("BEGIN"); await context(["contract.read","contract.identity.update","audit.write"]);
  const residual=await client.query("SELECT count(*)::int count FROM tcms.contractors WHERE code=$1",[marker]); await client.query("ROLLBACK");
  const result={unauthorizedWriteBlocked,createVersion:created.rows[0].version,updateVersion:updated.rows[0].version,
    staleUpdateRows:stale.rowCount,auditEventsInsideTransaction:audit.rows[0].count,auditSensitiveCiphertextRemoved:audit.rows[0].redacted,
    unlinkedActiveContracts:linked.rows[0].count,residualRows:residual.rows[0].count};
  if(!unauthorizedWriteBlocked||result.createVersion!==1||result.updateVersion!==2||result.staleUpdateRows!==0||result.auditEventsInsideTransaction!==2||!result.auditSensitiveCiphertextRemoved||result.unlinkedActiveContracts!==0||result.residualRows!==0)throw new Error("CONTRACTOR_MANAGEMENT_VERIFICATION_FAILED");
  console.log(JSON.stringify(result,null,2));
}finally{await client.query("ROLLBACK").catch(()=>undefined);await client.end();}
