export type UserRole = "admin" | "evaluator" | "candidate";

export type SupportedLanguage = "python" | "javascript";

export type SessionPhase = "coding" | "debugging" | "submitted";

export type TestCaseVisibility = "public" | "hidden" | "debug";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface BugInjectionRule {
  language: SupportedLanguage;
  title: string;
  description: string;
  hint: string;
  /** Deterministic regex/string mutation rules tried in order against candidate's working code */
  mutations: Array<{
    pattern: string;
    replacement: string;
    flags?: string;
  }>;
  /** Fallback buggy wrapper/snippet if candidate's code structure doesn't match regex mutations */
  fallback_bug_instruction: string;
}

export interface RubricConfig {
  prompt_quality_max: number; // default 40
  prompt_improvement_max: number; // default 10
  test_cases_max: number; // default 30
  debug_test_cases_max: number; // default 20
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  supported_languages: SupportedLanguage[];
  starter_code: Record<SupportedLanguage, string>;
  reference_solution: Record<SupportedLanguage, string>;
  bug_injection_spec: Record<SupportedLanguage, BugInjectionRule>;
  time_limit_minutes: number;
  token_budget: number;
  rubric_config: RubricConfig;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface TestCase {
  id: string;
  challenge_id: string;
  name: string;
  input: string;
  expected_output: string;
  visibility: TestCaseVisibility;
  weight: number;
  sort_order: number;
}

export interface CandidateSession {
  id: string;
  challenge_id: string;
  user_id: string | null;
  assigned_evaluator_id?: string | null;
  candidate_name: string;
  candidate_email: string;
  is_synthetic: boolean;
  language: SupportedLanguage;
  phase: SessionPhase;
  current_code: string;
  phase1_passed_code: string | null;
  injected_bug_code: string | null;
  injected_bug_description: string | null;
  tokens_used: number;
  tokens_saved: number;
  token_budget: number;
  rolling_summary: string | null;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  updated_at: string;
}

export interface EfficiencyHint {
  severity: "info" | "warning" | "critical";
  code: string;
  message: string;
  estimated_savings?: number;
}

export interface PromptTurn {
  id: string;
  session_id: string;
  turn_number: number;
  phase: SessionPhase;
  user_prompt: string;
  ai_response: string;
  extracted_code: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  naive_tokens_estimate: number;
  tokens_saved: number;
  context_strategy: string;
  efficiency_hints: EfficiencyHint[];
  created_at: string;
}

export interface CodeRevision {
  id: string;
  session_id: string;
  revision_number: number;
  source: "starter" | "ai_apply" | "manual_edit" | "bug_injection";
  code: string;
  note: string | null;
  created_at: string;
}

export interface SingleTestResult {
  test_case_id: string;
  name: string;
  visibility: TestCaseVisibility;
  passed: boolean;
  actual_output: string;
  expected_output: string;
  stderr: string | null;
  status: string;
  runtime_ms: number;
}

export interface ExecutionRun {
  id: string;
  session_id: string;
  phase: SessionPhase;
  executor_engine: "judge0" | "local_fallback";
  passed_count: number;
  total_count: number;
  results: SingleTestResult[];
  runtime_ms: number;
  created_at: string;
}

export interface IntegrityEvent {
  id: string;
  session_id: string;
  event_type:
    | "session_start"
    | "tab_blur"
    | "large_paste"
    | "ai_code_applied"
    | "phase_transition"
    | "bug_injected"
    | "budget_warning"
    | "budget_exceeded"
    | "session_submitted";
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RubricCriterionResult {
  criterion: string;
  score: number;
  max_score: number;
  explanation: string;
  cited_turns: number[];
}

export interface ScorecardBreakdown {
  prompt_quality: {
    total: number;
    max: number;
    summary: string;
    criteria: RubricCriterionResult[];
  };
  prompt_improvement: {
    total: number;
    max: number;
    summary: string;
    cited_turns: number[];
  };
  test_cases: {
    total: number;
    max: number;
    passed: number;
    total_tests: number;
    summary: string;
  };
  debug_test_cases: {
    total: number;
    max: number;
    passed: number;
    total_tests: number;
    summary: string;
  };
  token_efficiency_summary: string;
  overall_verdict: string;
}

export interface Scorecard {
  id: string;
  session_id: string;
  prompt_quality_score: number;
  prompt_improvement_score: number;
  test_cases_score: number;
  debug_test_cases_score: number;
  total_score: number;
  rubric_breakdown: ScorecardBreakdown;
  evaluator_notes: string | null;
  created_at: string;
}
