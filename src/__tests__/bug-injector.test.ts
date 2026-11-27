import { describe, it, expect } from "vitest";
import { injectControlledBug } from "@/lib/engines/bug-injector";
import type { BugInjectionRule, TestCase } from "@/types/assessment";

const debugTest: TestCase = {
  id: "tc-debug-1",
  challenge_id: "ch-1",
  name: "Exact Threshold Boundary",
  input: '{"val": 5, "threshold": 5}',
  expected_output: "true",
  visibility: "debug",
  weight: 2,
  sort_order: 1,
};

const rule: BugInjectionRule = {
  language: "javascript",
  title: "Strict Boundary Off-by-One",
  description: "Mutates >= to > so exact threshold equality fails.",
  hint: "Check boundary comparison operators.",
  mutations: [{ pattern: ">=", replacement: ">", flags: "g" }],
  fallback_bug_instruction: "Change >= to > in threshold check.",
};

describe("Controlled Bug Injection Engine", () => {
  it("injects a surgical deterministic bug directly into the candidate's submitted code", async () => {
    const candidateWorkingCode = `
const fs = require("fs");
function myCustomCandidateCheck(data) {
  return data.val >= data.threshold;
}
const input = JSON.parse(fs.readFileSync(0, "utf8"));
console.log(JSON.stringify(myCustomCandidateCheck(input)));
    `.trim();

    const result = await injectControlledBug({
      workingCode: candidateWorkingCode,
      language: "javascript",
      rule,
      testCases: [debugTest],
    });

    // Must preserve the candidate's exact custom function name & structure
    expect(result.mutatedCode).toContain("myCustomCandidateCheck");
    expect(result.mutatedCode).not.toBe(candidateWorkingCode);
    expect(result.mutatedCode).toContain("data.val > data.threshold");
    expect(result.method).toBe("deterministic_rule");
    expect(result.verifiedFailingTest).toBe("Exact Threshold Boundary");
  });
});
