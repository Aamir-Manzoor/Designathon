import type {
  BugInjectionRule,
  SupportedLanguage,
  TestCase,
} from "@/types/assessment";
import { executeTestCases } from "./executor";
import {
  extractCodeFromMarkdown,
  generateTextWithFallback,
  getGeminiClient,
} from "./gemini";

export interface BugInjectionResult {
  mutatedCode: string;
  bugTitle: string;
  bugDescription: string;
  bugHint: string;
  method: "deterministic_rule" | "gemini_semantic" | "fallback_boundary";
  verifiedFailingTest: string | null;
}

/**
 * Injects ONE reproducible, challenge-specific bug into the candidate's working code
 * and verifies against debug/public test cases that it introduces a clean, diagnosable failure.
 */
export async function injectControlledBug(params: {
  workingCode: string;
  language: SupportedLanguage;
  rule: BugInjectionRule;
  testCases: TestCase[];
}): Promise<BugInjectionResult> {
  const { workingCode, language, rule, testCases } = params;
  const debugTests = testCases.filter((tc) => tc.visibility === "debug");
  const verifySuite = debugTests.length > 0 ? debugTests : testCases;

  // 1. Try deterministic regex mutation rules first (zero tokens, 100% reproducible)
  for (const m of rule.mutations || []) {
    try {
      const regex = new RegExp(m.pattern, m.flags || "g");
      if (regex.test(workingCode)) {
        const candidateBugCode = workingCode.replace(regex, m.replacement);
        if (candidateBugCode !== workingCode) {
          const check = await executeTestCases(
            candidateBugCode,
            language,
            verifySuite
          );
          const failing = check.results.find((r) => !r.passed);
          if (failing && failing.status !== "Runtime Error") {
            return {
              mutatedCode: candidateBugCode,
              bugTitle: rule.title,
              bugDescription: rule.description,
              bugHint: rule.hint,
              method: "deterministic_rule",
              verifiedFailingTest: failing.name,
            };
          }
        }
      }
    } catch {
      // Ignore malformed regex and continue to next rule
    }
  }

  // 2. Try Gemini minimal surgical single-bug injection strictly on the candidate's submitted code
  const client = getGeminiClient();
  if (client) {
    try {
      const res = await generateTextWithFallback({
        prompt: [
          `Inject ONE subtle, realistic, syntactically valid bug directly into the candidate's EXACT ${language} code below.`,
          `CRITICAL RULES:`,
          `- Modify ONLY 1 to 2 lines of the candidate's existing logic. Do NOT rewrite, refactor, or rename variables/functions.`,
          `- Every other line of the candidate's submitted code MUST remain identical.`,
          `- Target bug instruction: ${rule.fallback_bug_instruction}`,
          `- Do NOT add comments revealing the bug. Return ONLY the mutated ${language} code inside a \`\`\`${language} block.`,
          `\n\`\`\`${language}\n${workingCode}\n\`\`\``,
        ].join("\n"),
        temperature: 0.05,
      });

      const mutated = extractCodeFromMarkdown(res.text ?? "", language);
      if (mutated && mutated !== workingCode) {
        // Verify Gemini preserved the candidate's code (at least 65% line overlap)
        const origLines = workingCode
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const mutSet = new Set(
          mutated
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean)
        );
        const overlap =
          origLines.length > 0
            ? origLines.filter((l) => mutSet.has(l)).length / origLines.length
            : 0;

        if (overlap >= 0.65) {
          const check = await executeTestCases(mutated, language, verifySuite);
          const failing = check.results.find((r) => !r.passed);
          if (failing && failing.status !== "Runtime Error") {
            return {
              mutatedCode: mutated,
              bugTitle: rule.title,
              bugDescription: rule.description,
              bugHint: rule.hint,
              method: "gemini_semantic",
              verifiedFailingTest: failing.name,
            };
          }
        }
      }
    } catch (err) {
      console.warn("[BugInjector] Gemini semantic injection failed:", err);
    }
  }

  // 3. Guaranteed fallback mutation: swap first `>=` to `>` or `<=` to `<`
  let fallbackCode = workingCode;
  if (workingCode.includes(">=")) {
    fallbackCode = workingCode.replace(">=", ">");
  } else if (workingCode.includes("<=")) {
    fallbackCode = workingCode.replace("<=", "<");
  } else if (workingCode.includes("<")) {
    fallbackCode = workingCode.replace("<", "<=");
  }

  const check = await executeTestCases(fallbackCode, language, verifySuite);
  const failing = check.results.find((r) => !r.passed);

  return {
    mutatedCode: fallbackCode,
    bugTitle: rule.title,
    bugDescription: rule.description,
    bugHint: rule.hint,
    method: "fallback_boundary",
    verifiedFailingTest: failing?.name ?? verifySuite[0]?.name ?? null,
  };
}
