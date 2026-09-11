import { apiError } from "@/server/http/api-response";
import { getRequestContext } from "@/server/http/request-context";
import { requireContractPermission } from "@/server/contracts/contract-api";
import { parseContractGoodsItemInput } from "@/server/contracts/contract-goods-item-service";
import { PostgresContractGoodsItemRepository } from "@/server/contracts/postgres-contract-goods-item-repository";
import { PostgresContractRepository } from "@/server/contracts/postgres-contract-repository";
import { withSecurityTransaction } from "@/server/db/security-transaction";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context=await getRequestContext(request); const {id}=await params; const result=await withSecurityTransaction(context,async(client)=>{const contract=await new PostgresContractRepository(client).findById(id); if(!contract)return null; requireContractPermission(context.principal,"contract.read",contract); return new PostgresContractGoodsItemRepository(client).list(id);}); return result ? Response.json({items:result},{headers:{"cache-control":"no-store"}}) : Response.json({error:"NOT_FOUND"},{status:404}); } catch(error) { return apiError(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const context=await getRequestContext(request); const {id}=await params; const input=parseContractGoodsItemInput(await request.json()); const item=await withSecurityTransaction(context,async(client)=>{const contract=await new PostgresContractRepository(client).findById(id); if(!contract)return null; requireContractPermission(context.principal,"contract.identity.update",contract); return new PostgresContractGoodsItemRepository(client).create(id,input,context.principal.userId);}); return item ? Response.json({item},{status:201}) : Response.json({error:"NOT_FOUND"},{status:404}); } catch(error) { return apiError(error); }
}
