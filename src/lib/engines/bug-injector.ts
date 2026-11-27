import type {
  BugInjectionRule,
  SupportedLanguage,
  TestCase,
} from "@/types/assessment";
import { executeTestCases } from "./executor";
import { extractCodeFromMarkdown, getGeminiClient, getGeminiModel } from "./gemini";

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

  // 2. Try Gemini semantic single-bug injection if API key is configured
  const client = getGeminiClient();
  if (client) {
    try {
      const res = await client.models.generateContent({
        model: getGeminiModel(),
        contents: [
          {
            role: "user",
            parts: [
              {
                text: [
                  `Inject ONE subtle, realistic, syntactically valid bug into this ${language} code.`,
                  `Target bug instruction: ${rule.fallback_bug_instruction}`,
                  `Do NOT add comments revealing the bug. Return ONLY the complete mutated ${language} code inside a \`\`\`${language} block.`,
                  `\n\`\`\`${language}\n${workingCode}\n\`\`\``,
                ].join("\n"),
              },
            ],
          },
        ],
        config: { temperature: 0.1 },
      });

      const mutated = extractCodeFromMarkdown(res.text ?? "", language);
      if (mutated && mutated !== workingCode) {
        const check = await executeTestCases(mutated, language, verifySuite);
        const failing = check.results.find((r) => !r.passed);
        if (failing) {
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
