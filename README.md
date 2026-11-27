# PromptBench — AI-Assisted Coding Challenge Assessment Platform

An enterprise-grade AI-assisted coding assessment platform built with **Next.js (App Router, TypeScript)**, **Tailwind CSS**, **Supabase (PostgreSQL + JWT Auth + RLS)**, **Judge0 CE**, and **Google Gemini**.

## Minimum Scope Implemented
1. **Challenge Configuration & Launch**: Full Admin console to configure coding challenges, time limits, token budgets, public/hidden/debug test cases, and deterministic bug-injection rules. Pre-seeded with 3 complete challenges (*Sliding Window API Rate Limiter*, *Log Anomaly & Spike Aggregator*, *Deployment Maintenance Window Merger*).
2. **AI-Assisted Coding & Controlled Bug Injection Workflow**:
   - Full email/password JWT authentication with role-based access (`Admin / Evaluator` vs `Candidate`).
   - 3-pane IDE workspace with Monaco Editor, revision history, timed session countdown, debounced autosave, and integrity telemetry (`tab_blur`, `ai_code_applied`, `bug_injected`, `budget_warning`).
   - Isolated code execution via **Judge0 CE** batch API (with automatic local Python/Node fallback when `JUDGE0_API_KEY` is not yet configured).
   - Controlled reproducible bug injection after initial public tests pass, transitioning seamlessly to Phase 2 (Debug & Resubmit).
3. **Explainable 100-Point Scoring Engine**:
   - **Prompt Quality (40)** across 4 criteria with turn citations
   - **Prompt Improvement (10)** across iterative turns
   - **Test Cases (30)** from public + hidden automated execution
   - **Debug Test Cases (20)** from post-bug-injection verification
4. **Token Optimization Engine, Live Visual Meter & Excel Export**:
   - Context-reduction pipeline: reusable system instructions + rolling conversation summary + editor code deduplication.
   - Live Candidate Token Budget Meter showing remaining tokens, burn trend sparkline, real-time **Tokens Saved**, high-consumption warnings (75% / 90%), and pre-send prompt-efficiency hints.
   - Pre-seeded with **5 synthetic candidate sessions** (full prompt histories, token logs, and 100-pt scorecards) + multi-sheet formatted **Excel (`.xlsx`) export**.

## Bonus Capabilities Implemented
- **Configurable Token Budgets & Cost Analytics**: Inline challenge token-budget & time-limit editor in `/admin`, per-candidate USD cost & efficiency index (`Pts / 1K Tok`) in UI and `.xlsx` export, plus a **Correctness vs. Token Efficiency** scatter plot.
- **Adaptive Context-Window Management, Prompt Compression & Multi-Provider AI**: Automatic `Standard → Compact → Ultra-Lean` context tiers as budget depletes, 1-click **Compress Prompt** suggestions with exact token savings preview, and multi-provider routing (`Auto`, `Google Gemini`, `Groq`, `OpenRouter`).
- **Calibrated Rubric Checks, Queue-Based Execution, Concurrency Testing & Automatic Recovery**: Bounded-concurrency FIFO execution queue with automatic retry, `localStorage` + Supabase dual-layer crash/reload draft recovery, 3-anchor rubric calibration verifier, and live parallel concurrency stress test in `/admin` → **Calibration & Queue Ops**.

## Environment Setup
`.env.local` is pre-configured for the connected Supabase project (`dfamjqvblqikjuxplfbb`). Add your **Gemini API Key** (and optionally **Judge0 CE** key) in `.env.local`:

```bash
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite

# Optional: Judge0 CE (falls back to local Python/Node runner when empty)
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
ALLOW_LOCAL_EXECUTOR_FALLBACK=true
```

## Run Locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`. Register an **Admin / Evaluator** account to view the 5 pre-seeded candidate scorecards and export `.xlsx`, or register a **Candidate** account to take the live AI-assisted assessment.
