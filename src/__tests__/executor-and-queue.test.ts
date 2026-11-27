import { describe, it, expect } from "vitest";
import { executeTestCases } from "@/lib/engines/executor";
import { executionQueue } from "@/lib/engines/execution-queue";
import type { TestCase } from "@/types/assessment";

const sampleTests: TestCase[] = [
  {
    id: "tc-1",
    challenge_id: "ch-1",
    name: "Doubles input array",
    input: "[1, 2, 3]",
    expected_output: "[2, 4, 6]",
    visibility: "public",
    weight: 1,
    sort_order: 1,
  },
  {
    id: "tc-2",
    challenge_id: "ch-1",
    name: "Handles empty array",
    input: "[]",
    expected_output: "[]",
    visibility: "hidden",
    weight: 1,
    sort_order: 2,
  },
];

describe("Code Execution Engine & Concurrency Queue", () => {
  it("executes valid JavaScript solution and normalizes canonical JSON output", async () => {
    const jsCode = `
      const fs = require("fs");
      const arr = JSON.parse(fs.readFileSync(0, "utf8"));
      console.log(JSON.stringify(arr.map(x => x * 2)));
    `;
    const res = await executeTestCases(jsCode, "javascript", sampleTests);
    expect(res.passedCount).toBe(2);
    expect(res.totalCount).toBe(2);
    expect(res.results.every((r) => r.passed)).toBe(true);
  });

  it("executes valid Python solution locally", async () => {
    const pyCode = `
import sys, json
arr = json.loads(sys.stdin.read())
print(json.dumps([x * 2 for x in arr]))
    `.trim();
    const res = await executeTestCases(pyCode, "python", sampleTests);
    expect(res.passedCount).toBe(2);
    expect(res.totalCount).toBe(2);
  });

  it("reports Wrong Answer and Runtime Error accurately", async () => {
    const wrongJs = `console.log("[999]");`;
    const wrongRes = await executeTestCases(wrongJs, "javascript", [sampleTests[0]]);
    expect(wrongRes.passedCount).toBe(0);
    expect(wrongRes.results[0].status).toBe("Wrong Answer");

    const crashJs = `throw new Error("boom");`;
    const crashRes = await executeTestCases(crashJs, "javascript", [sampleTests[0]]);
    expect(crashRes.passedCount).toBe(0);
    expect(crashRes.results[0].status).toBe("Runtime Error");
    expect(crashRes.results[0].stderr).toContain("boom");
  });

  it("processes parallel jobs through bounded FIFO execution queue without dropping work", async () => {
    const jsCode = `
      const fs = require("fs");
      const arr = JSON.parse(fs.readFileSync(0, "utf8"));
      console.log(JSON.stringify(arr.map(x => x * 2)));
    `;
    const jobs = Array.from({ length: 4 }, () =>
      executionQueue.enqueue({
        code: jsCode,
        language: "javascript",
        testCases: [sampleTests[0]],
      })
    );
    const results = await Promise.all(jobs);
    expect(results).toHaveLength(4);
    expect(results.every((r) => r.passedCount === 1 && r.attempts >= 1)).toBe(true);
    expect(results.every((r) => r.jobId.startsWith("job_"))).toBe(true);
  });
});
