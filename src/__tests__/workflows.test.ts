import { describe, it, expect } from "vitest";
import {
  formatDuration,
  formatNumber,
  estimateTokensRough,
} from "@/lib/utils";
import { extractCodeFromMarkdown } from "@/lib/engines/gemini";

describe("Core Utilities & Timer Formatting", () => {
  it("formats countdown durations accurately including zero and negative bounds", () => {
    expect(formatDuration(2700)).toBe("45:00");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(-15)).toBe("00:00");
  });

  it("formats numbers and estimates tokens cleanly", () => {
    expect(formatNumber(6000)).toBe("6,000");
    expect(estimateTokensRough("")).toBe(0);
    expect(estimateTokensRough("12345678")).toBe(2);
  });

  it("extracts Python and JavaScript code blocks cleanly from AI markdown responses", () => {
    const md = "Here is the fix:\n```python\ndef solve(x):\n    return x + 1\n```\nDone.";
    expect(extractCodeFromMarkdown(md, "python")).toBe(
      "def solve(x):\n    return x + 1"
    );

    const jsMd = "```js\nfunction solve(x) { return x + 1; }\n```";
    expect(extractCodeFromMarkdown(jsMd, "javascript")).toBe(
      "function solve(x) { return x + 1; }"
    );
  });
});
