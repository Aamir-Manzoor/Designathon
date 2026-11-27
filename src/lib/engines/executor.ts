import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, unlink, mkdtemp, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type {
  SingleTestResult,
  SupportedLanguage,
  TestCase,
} from "@/types/assessment";

const execFileAsync = promisify(execFile);

const JUDGE0_LANG_IDS: Record<SupportedLanguage, number> = {
  python: 71, // Python 3.8.1+
  javascript: 63, // JavaScript (Node.js)
};

function normalizeOutput(s: string | null | undefined): string {
  if (!s) return "";
  const trimmed = s.trim();
  // Try canonical JSON comparison so [true,true] matches [true, true]
  try {
    return JSON.stringify(JSON.parse(trimmed));
  } catch {
    return trimmed.replace(/\r\n/g, "\n");
  }
}

export interface ExecutionBatchResult {
  engine: "judge0" | "local_fallback";
  passedCount: number;
  totalCount: number;
  runtimeMs: number;
  results: SingleTestResult[];
}

async function runViaJudge0(
  code: string,
  language: SupportedLanguage,
  testCases: TestCase[]
): Promise<ExecutionBatchResult> {
  const baseUrl = (
    process.env.JUDGE0_API_URL || "https://judge0-ce.p.rapidapi.com"
  ).replace(/\/$/, "");
  const apiKey = process.env.JUDGE0_API_KEY?.trim();
  const apiHost = process.env.JUDGE0_API_HOST?.trim();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    if (baseUrl.includes("rapidapi.com")) {
      headers["X-RapidAPI-Key"] = apiKey;
      headers["X-RapidAPI-Host"] = apiHost || "judge0-ce.p.rapidapi.com";
    } else {
      headers["X-Auth-Token"] = apiKey;
    }
  }

  const startTime = Date.now();
  const submissions = testCases.map((tc) => ({
    language_id: JUDGE0_LANG_IDS[language],
    source_code: code,
    stdin: tc.input,
    cpu_time_limit: 3,
    wall_time_limit: 5,
  }));

  const submitRes = await fetch(
    `${baseUrl}/submissions/batch?base64_encoded=false`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ submissions }),
    }
  );

  if (!submitRes.ok) {
    throw new Error(`Judge0 batch submit failed: HTTP ${submitRes.status}`);
  }

  const tokensData = (await submitRes.json()) as Array<{ token: string }>;
  const tokens = tokensData.map((t) => t.token).join(",");

  // Poll up to 12 times (~9s max)
  let rawResults: Array<{
    stdout: string | null;
    stderr: string | null;
    compile_output: string | null;
    status: { id: number; description: string };
    time: string | null;
  }> = [];

  for (let attempt = 0; attempt < 12; attempt++) {
    await new Promise((r) => setTimeout(r, 750));
    const pollRes = await fetch(
      `${baseUrl}/submissions/batch?tokens=${tokens}&base64_encoded=false&fields=stdout,stderr,compile_output,status,time`,
      { headers }
    );
    if (!pollRes.ok) {
      throw new Error(`Judge0 poll failed: HTTP ${pollRes.status}`);
    }
    const pollJson = (await pollRes.json()) as {
      submissions: typeof rawResults;
    };
    rawResults = pollJson.submissions;
    const stillRunning = rawResults.some(
      (r) => r.status.id === 1 || r.status.id === 2
    );
    if (!stillRunning) break;
  }

  const results: SingleTestResult[] = testCases.map((tc, i) => {
    const r = rawResults[i];
    const actual = (r?.stdout ?? "").trim();
    const expected = tc.expected_output.trim();
    const stderr = r?.stderr || r?.compile_output || null;
    const passed =
      r?.status?.id === 3 &&
      normalizeOutput(actual) === normalizeOutput(expected);

    return {
      test_case_id: tc.id,
      name: tc.name,
      visibility: tc.visibility,
      passed,
      actual_output: actual,
      expected_output: expected,
      stderr,
      status: r?.status?.description || "Unknown",
      runtime_ms: r?.time ? Math.round(parseFloat(r.time) * 1000) : 0,
    };
  });

  return {
    engine: "judge0",
    passedCount: results.filter((r) => r.passed).length,
    totalCount: results.length,
    runtimeMs: Date.now() - startTime,
    results,
  };
}

async function runViaLocalFallback(
  code: string,
  language: SupportedLanguage,
  testCases: TestCase[]
): Promise<ExecutionBatchResult> {
  const startTime = Date.now();
  const dir = await mkdtemp(path.join(tmpdir(), "promptbench-"));
  const ext = language === "python" ? "py" : "js";
  const filePath = path.join(dir, `solution.${ext}`);
  await writeFile(filePath, code, "utf8");

  const results: SingleTestResult[] = [];
  try {
    for (const tc of testCases) {
      const t0 = Date.now();
      try {
        const cmd = language === "python" ? "python" : "node";
        const child = execFileAsync(cmd, [filePath], {
          timeout: 3000,
          maxBuffer: 1024 * 512,
        });
        child.child.stdin?.write(tc.input);
        child.child.stdin?.end();
        const { stdout, stderr } = await child;
        const actual = (stdout ?? "").trim();
        const expected = tc.expected_output.trim();
        const passed = normalizeOutput(actual) === normalizeOutput(expected);

        results.push({
          test_case_id: tc.id,
          name: tc.name,
          visibility: tc.visibility,
          passed,
          actual_output: actual,
          expected_output: expected,
          stderr: stderr?.trim() || null,
          status: passed ? "Accepted" : "Wrong Answer",
          runtime_ms: Date.now() - t0,
        });
      } catch (err: unknown) {
        const e = err as { stderr?: string; message?: string; killed?: boolean };
        results.push({
          test_case_id: tc.id,
          name: tc.name,
          visibility: tc.visibility,
          passed: false,
          actual_output: "",
          expected_output: tc.expected_output.trim(),
          stderr: e.stderr?.trim() || e.message || "Runtime Error",
          status: e.killed ? "Time Limit Exceeded" : "Runtime Error",
          runtime_ms: Date.now() - t0,
        });
      }
    }
  } finally {
    await unlink(filePath).catch(() => {});
    await rmdir(dir).catch(() => {});
  }

  return {
    engine: "local_fallback",
    passedCount: results.filter((r) => r.passed).length,
    totalCount: results.length,
    runtimeMs: Date.now() - startTime,
    results,
  };
}

/**
 * Executes candidate code against a list of test cases.
 * Uses Judge0 CE when configured; gracefully falls back to local sandboxed runner
 * if ALLOW_LOCAL_EXECUTOR_FALLBACK=true and Judge0 CE is unavailable.
 */
export async function executeTestCases(
  code: string,
  language: SupportedLanguage,
  testCases: TestCase[]
): Promise<ExecutionBatchResult> {
  const hasJudge0Key = Boolean(process.env.JUDGE0_API_KEY?.trim());
  const isSelfHostedJudge0 =
    Boolean(process.env.JUDGE0_API_URL?.trim()) &&
    !process.env.JUDGE0_API_URL!.includes("rapidapi.com");
  const allowFallback =
    process.env.ALLOW_LOCAL_EXECUTOR_FALLBACK !== "false";

  if (hasJudge0Key || isSelfHostedJudge0) {
    try {
      return await runViaJudge0(code, language, testCases);
    } catch (err) {
      if (!allowFallback) throw err;
      console.warn(
        "[Executor] Judge0 CE failed, falling back to local runner:",
        err
      );
    }
  }

  if (!allowFallback) {
    throw new Error(
      "Judge0 CE is not configured and ALLOW_LOCAL_EXECUTOR_FALLBACK is disabled."
    );
  }

  return await runViaLocalFallback(code, language, testCases);
}
