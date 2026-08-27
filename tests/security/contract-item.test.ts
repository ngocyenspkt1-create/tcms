import assert from "node:assert/strict";
import test from "node:test";

import { parseContractItemInput, summarizeContractItems } from "../../src/server/contracts/contract-item-service.ts";
import type { ContractItem } from "../../src/types/contract-item.ts";

function item(overrides: Partial<ContractItem>): ContractItem {
  return { id:"item",contractId:"contract",sequenceNumber:1,serviceDescription:"Hạng mục",weightPercent:50,progressPercent:20,status:"IN_PROGRESS",version:1,...overrides };
}

test("contract item validation rejects invalid quantity and percentages",()=>{
  assert.throws(()=>parseContractItemInput({serviceDescription:"A",weightPercent:101,progressPercent:0,status:"NOT_STARTED"}),SyntaxError);
  assert.throws(()=>parseContractItemInput({serviceDescription:"A",quantity:2,completedQuantity:3,weightPercent:50,progressPercent:0,status:"NOT_STARTED"}),SyntaxError);
});

test("weighted progress is available only when total weight is 100",()=>{
  const incomplete=summarizeContractItems([item({weightPercent:40,progressPercent:50})]);
  assert.equal(incomplete.weightComplete,false); assert.equal(incomplete.weightedProgressPercent,null);
  const complete=summarizeContractItems([item({id:"a",weightPercent:40,progressPercent:50}),item({id:"b",weightPercent:60,progressPercent:100,status:"COMPLETED"})]);
  assert.equal(complete.weightComplete,true); assert.equal(complete.weightedProgressPercent,80); assert.equal(complete.completedItems,1);
});
