import {permissionsForRoles} from "@/lib/security/authorization";
import {requireContractPermission,requireRolePermission} from "@/server/contracts/contract-api";
import {PostgresContractRepository} from "@/server/contracts/postgres-contract-repository";
import {withSecurityTransaction} from "@/server/db/security-transaction";
import {apiError} from "@/server/http/api-response";
import {getRequestContext} from "@/server/http/request-context";
import {parseInspectionInput} from "@/server/inspections/inspection-service";
import {PostgresInspectionRepository} from "@/server/inspections/postgres-inspection-repository";

export async function GET(request:Request){try{const context=await getRequestContext(request);requireRolePermission(context.principal,"contract.read");const canManage=permissionsForRoles(context.principal.roles).has("contract.acceptance.update");const result=await withSecurityTransaction(context,async(client)=>{const repository=new PostgresInspectionRepository(client);return {inspections:await repository.list(),summary:await repository.summary(),options:await repository.options(canManage)};});return Response.json({...result,capabilities:{canManage}},{headers:{"cache-control":"no-store"}});}catch(error){return apiError(error);}}
export async function POST(request:Request){try{const context=await getRequestContext(request);const input=parseInspectionInput(await request.json());const inspection=await withSecurityTransaction(context,async(client)=>{const contract=await new PostgresContractRepository(client).findById(input.contractId);if(!contract)throw new Error("INSPECTION_CONTRACT_NOT_FOUND");requireContractPermission(context.principal,"contract.acceptance.update",contract);return new PostgresInspectionRepository(client).create(input,context.principal.userId);});return Response.json({inspection},{status:201,headers:{"cache-control":"no-store"}});}catch(error){return apiError(error);}}
