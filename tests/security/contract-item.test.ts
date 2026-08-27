import assert from "node:assert/strict";
import test from "node:test";

import {
  allocateEqualWeights,
  parseChecklistCompletionInput,
  parseContractItemInput,
  parseDailyLogInput,
  splitWorkContentIntoChecklistItems,
  summarizeContractItems,
  validateImportWeightTotal,
} from "../../src/server/contracts/contract-item-service.ts";
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

test("equal weight allocation always totals exactly 100.00 percent", () => {
  assert.deepEqual(allocateEqualWeights(8), Array(8).fill(12.5));
  assert.deepEqual(allocateEqualWeights(3), [33.33, 33.33, 33.34]);
  assert.equal(allocateEqualWeights(7).reduce((sum, weight) => sum + weight, 0), 100);
  assert.doesNotThrow(() => validateImportWeightTotal([33.33, 33.33, 33.34]));
  assert.throws(() => validateImportWeightTotal([50, 49]), SyntaxError);
});

test("work content is split only when every line is a clear list item", () => {
  assert.deepEqual(splitWorkContentIntoChecklistItems("1. Kiểm tra\n2. Thí nghiệm\n3. Bàn giao"), ["Kiểm tra", "Thí nghiệm", "Bàn giao"]);
  assert.deepEqual(splitWorkContentIntoChecklistItems("Kiểm tra tổng thể rồi bàn giao"), ["Kiểm tra tổng thể rồi bàn giao"]);
  assert.deepEqual(splitWorkContentIntoChecklistItems("Phạm vi:\n- Kiểm tra\n- Bàn giao"), ["Phạm vi:\n- Kiểm tra\n- Bàn giao"]);
});

test("checklist and daily log inputs reject client-owned audit metadata", () => {
  assert.deepEqual(parseChecklistCompletionInput({ isCompleted: true, expectedVersion: 2, completedBy: "forged" }), { isCompleted: true, expectedVersion: 2 });
  assert.deepEqual(parseDailyLogInput({ logDate: "2026-08-27", note: "  Đang thực hiện  ", createdBy: "forged" }), { logDate: "2026-08-27", note: "Đang thực hiện" });
  assert.throws(() => parseDailyLogInput({ logDate: "27/08/2026", note: "A" }), SyntaxError);
});
