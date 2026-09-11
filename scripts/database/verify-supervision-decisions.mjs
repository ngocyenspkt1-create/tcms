import pg from "pg";
import { assertDevelopmentDatabase,databaseUrl } from "./config.mjs";

const url=await databaseUrl(); assertDevelopmentDatabase(url);
const client=new pg.Client({connectionString:url,application_name:"tcms-verify-supervision-decisions"});
const marker=`VERIFY-QDGS-${Date.now()}`; let unauthorizedWriteBlocked=false; let crossContractScopeBlocked=false;

async function context(permissions,globalScope=true){
  const settings=[["app.actor_id","00000000-0000-0000-0000-000000000002"],["app.permissions",JSON.stringify(permissions)],
    ["app.department_ids","[]"],["app.assigned_contract_ids","[]"],["app.global_contract_scope",String(globalScope)],
    ["app.environment","development"],["app.correlation_id",crypto.randomUUID()],["app.app_version","supervision-verifier"]];
  for(const [name,value] of settings)await client.query("SELECT set_config($1,$2,true)",[name,value]);
}

await client.connect();
try{
  await client.query("BEGIN"); await context(["contract.read","audit.write"]); await client.query("SAVEPOINT unauthorized");
  const contract=(await client.query("SELECT id FROM tcms.contracts WHERE archived_at IS NULL ORDER BY created_at LIMIT 1")).rows[0];
  const user=(await client.query("SELECT id FROM tcms.app_users WHERE active ORDER BY created_at LIMIT 1")).rows[0];
  if(!contract||!user)throw new Error("DEV contract and personnel fixtures are required");
  try{await client.query(`INSERT INTO tcms.supervision_decisions(contract_id,decision_number,decision_date,title,effective_from,status,created_by,updated_by)
    VALUES($1,$2,current_date,'Không quyền',current_date,'DRAFT','verifier','verifier')`,[contract.id,marker]);}catch{unauthorizedWriteBlocked=true;await client.query("ROLLBACK TO SAVEPOINT unauthorized");}
  await context(["contract.read","contract.assignment.manage","audit.write","audit.read.business"]);
  const decision=await client.query(`INSERT INTO tcms.supervision_decisions(contract_id,decision_number,decision_date,title,effective_from,status,created_by,updated_by)
    VALUES($1,$2,current_date,'Quyết định kiểm thử',current_date,'DRAFT','verifier','verifier') RETURNING id,version`,[contract.id,marker]);
  const assignment=await client.query(`INSERT INTO tcms.supervision_assignments(decision_id,contract_id,user_id,supervisor_role,created_by,updated_by)
    VALUES($1,$2,$3,'Giám sát kiểm thử','verifier','verifier') RETURNING id`,[decision.rows[0].id,contract.id,user.id]);
  const updated=await client.query("UPDATE tcms.supervision_decisions SET status='ISSUED' WHERE id=$1 AND version=$2 RETURNING version",[decision.rows[0].id,decision.rows[0].version]);
  const stale=await client.query("UPDATE tcms.supervision_decisions SET notes='stale' WHERE id=$1 AND version=$2 RETURNING version",[decision.rows[0].id,decision.rows[0].version]);
  const otherContract=(await client.query("SELECT id FROM tcms.contracts WHERE id<>$1 AND archived_at IS NULL ORDER BY created_at LIMIT 1",[contract.id])).rows[0];
  if(otherContract){await client.query("SAVEPOINT cross_scope");try{await client.query(`INSERT INTO tcms.supervision_assignments(decision_id,contract_id,user_id,supervisor_role,created_by,updated_by)
    VALUES($1,$2,$3,'Sai hợp đồng','verifier','verifier')`,[decision.rows[0].id,otherContract.id,user.id]);}catch{crossContractScopeBlocked=true;await client.query("ROLLBACK TO SAVEPOINT cross_scope");}}
  else crossContractScopeBlocked=true;
  const audit=await client.query("SELECT count(*)::int count FROM tcms.audit_events WHERE resource_id IN ($1,$2)",[decision.rows[0].id,assignment.rows[0].id]);
  await client.query("ROLLBACK");
  await client.query("BEGIN"); await context(["contract.read","contract.assignment.manage","audit.write","audit.read.business"]);
  const residual=await client.query("SELECT count(*)::int count FROM tcms.supervision_decisions WHERE decision_number=$1",[marker]); await client.query("ROLLBACK");
  const result={unauthorizedWriteBlocked,createVersion:decision.rows[0].version,updateVersion:updated.rows[0].version,staleUpdateRows:stale.rowCount,crossContractScopeBlocked,auditEventsInsideTransaction:audit.rows[0].count,residualRows:residual.rows[0].count};
  console.log(JSON.stringify(result,null,2));
  if(!unauthorizedWriteBlocked||result.createVersion!==1||result.updateVersion!==2||result.staleUpdateRows!==0||!crossContractScopeBlocked||result.auditEventsInsideTransaction<3||result.residualRows!==0)throw new Error("SUPERVISION_DECISION_VERIFICATION_FAILED");
}finally{await client.query("ROLLBACK").catch(()=>undefined);await client.end();}
