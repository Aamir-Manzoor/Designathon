# Brag Plan: PromptBench

## What is this app?
PromptBench is an invite-only, token-conscious AI coding assessment platform that measures how engineers guide AI, debug injected regressions inside their own submitted code, and optimize live token budgets — scored on an explainable, turn-cited 100-point rubric.

## The angle
Conventional coding tests were built for a pre-AI world: they test syntax memorization with binary pass/fail graders, ignore how engineers actually prompt and validate AI, let runaway context burn inflate API assessment costs, and never test whether a candidate can debug a subtle regression in AI-assisted code. Our demo directly states this problem objective first, then walks step-by-step through PromptBench's real UI solving each gap end to end.

## Hook (first 2-3 seconds)
A sharp problem-statement frame titled **"THE ASSESSMENT GAP"** slams in: *"Conventional coding tests measure syntax memorization — not AI engineering."* Three high-contrast red failure cards snap in below it: **Blind to AI Guidance**, **Unchecked Token Burn**, and **Binary Pass / Fail**.

## Key moments (the middle)
- **Sealed 3-Pane AI IDE & Live Token Budget Meter:** Inside `solution.py · Python 3` (`Sliding Window Rate Limiter`), the candidate crafts an explicit $O(n)$ deque prompt while the **Live Token Budget** (`4,580 remaining · +1,180 saved`) and **Adaptive Context Engine** (`Standard → Compact → Ultra-Lean`, `-45% Tokens`) keep API spend lean as `3/3 Public Tests Passed · 14ms` turns green.
- **Phase 2 Controlled Bug Injection & Guided Debugging:** Passing 100% of Phase 1 unlocks Phase 2, which mutates the candidate's own code (`>= window` → `> window`), triggers `DEBUG TEST FAILED: Exact Window Boundary`, blocks lazy *"solve this bug"* prompts, and verifies a targeted 1-turn boundary fix.
- **Explainable 100-Pt Rubric, Evaluator Pass/Reject & Admin Governance:** The Evaluator Console displays the turn-cited `92.0 / 100` breakdown (`40 Prompt / 10 Improvement / 30 Tests / 20 Debug`), locks a one-time **Pass / Reject** decision with written feedback, exports **3-Sheet `.XLSX`** cost-vs-correctness analytics, and gates Admin **Release Report** so candidates receive **Passed + Evaluator Feedback** with zero numeric scores exposed.

## Outro / punchline
PromptBench's emerald CPU mark and live badge land dead-still above the verbatim hero claim: **"Measure how engineers guide AI, debug bugs, and optimize tokens."** followed by the live deployment pill `promptbench-beta.vercel.app`.

## User flow worth showing
1. **Entry (Problem → Sealed IDE):** Contrast conventional coding test failures against PromptBench's invite-only, single-access Timed AI IDE (`solution.py` + `Live Token Budget` + `Adaptive Context`).
2. **Key Action (Prompt → Pass Phase 1 → Debug Injected Bug):** Prompt AI with explicit constraints, pass `3/3 Public Tests` via Judge0 CE, receive a deterministic boundary mutation in the candidate's own code (`>= window` → `> window`), and diagnose + resolve `Exact Window Boundary`.
3. **Result (Turn-Cited 100-Pt Rubric → Evaluator Sign-Off → Admin Report Release):** Score `40 / 10 / 30 / 20` with turn citations, lock Evaluator `PASS` feedback, export 3-sheet `.xlsx` cohort analytics, and release score-free feedback to the candidate.

## Tone
- Preset: `polished`
- Creative direction: Crisp, authoritative developer-platform product walkthrough that explicitly bridges the Problem Objective to each real UI screen.
- Interpretation: Confident pacing across 5 structured scenes (24.0s total) with fast `expo.out` entrances, dead-still settled holds so technical UI copy is effortless to read, exact dark-emerald telemetry styling, and restrained sonic accents.

## Format: landscape — 1920x1080
## Duration: 24s

## Visual identity (from the project)
- Background: `#090a0c` (`--bg-canvas`), elevated cards `#111317` (`--surface-1`) and `#171a20` (`--surface-2`), code canvas `#0d1117`
- Accent: `#10b981` (Emerald `--accent`), `#34d399` (Emerald highlight), `#22d3ee` (Cyan telemetry), `#f59e0b` (Amber Phase 2 bug diff), `#f43f5e` (Rose failure contrast)
- Text: `#f8fafc` (`--text-primary`), `#cbd5e1` (`--text-secondary`), `#94a3b8` (`--text-muted`, WCAG AA compliant on dark surfaces)
- Display font: `Outfit` / `Inter` (bundled clean geometric sans matching `Plus Jakarta Sans` weight & tracking)
- Body / Code font: `Inter` (UI) and `JetBrains Mono` (code, token counters, rubric ratios)
- Strongest visual element: The 3-pane AI Assessment IDE (`solution.py` + Live Token Budget Meter), the Phase 2 Bug Injection Diff (`>= window` → `> window`), and the `40 / 10 / 30 / 20` Scorecard + Evaluator/Admin Governance split.
- Privacy note: Uses fictional benchmark candidate stand-in `Alex Rivera` (`Backend Engineer`) — zero real personal emails, database rows, or credentials appear anywhere.

## Share copy (draft)
Conventional coding tests measure syntax memorization — not how engineers guide AI, debug subtle regressions, or control token spend. Introducing PromptBench: a timed AI coding assessment IDE with live token budgets, controlled bug injection, and an explainable 100-point rubric.

## Audio direction
- Role: Steady, modern instrumental bed with sparse, tactile UI and reveal accents.
- Music: `happy-beats-business-moves-vol-12-by-ende-dot-app.mp3` (109.96 BPM, steady and clean).
- Music treatment: Starts at `0.0s` (`0.4s` fade-in) at `data-volume="0.32"`, steady under the walkthrough, gentle `1.2s` fade-out at `24.0s` so the final bell accent rings cleanly.
- Music cue guidance: Read from bundled preset `happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.md` (109.96 BPM). Strong cues targeted: `9.29s` (`0.97`, Scene 2 → Scene 3 Bug Injection cut), `18.56s` (`0.99`, Admin Report Released confirmation), and `22.37s` (`0.98`, final URL & metric lock). Beat-grid window `1.09s–2.19s` for sequential problem cards and `15.29s–16.93s` for rubric bars.
- Audio-reactive treatment: Subtle deterministic pulse aligned to the 109.96 BPM beat envelope on the background emerald ambient radial glow (`opacity` breathing gently between `0.22` and `0.34`) — zero waveform or equalizer bars.
- SFX posture: Sparse, low-HF-risk cues from `sfx-analysis.md` (`impactSoft_medium_001.ogg` on major scene reveals, `click_003.ogg` on simulated UI transitions, `bong_001.ogg` on Phase 2 bug alert, `impactBell_heavy_000.ogg` on final payoff).
- Audio-coupled moments: Sequential arrival of the 3 problem-gap cards in Scene 1, Phase 2 Bug Injection alert at `9.29s`, Evaluator `PASS` + Admin `Release Report` confirmation, and the Scene 5 PromptBench brand lock.
- Restraint rule: Never stack loud hits over dense UI copy or overwhelm the steady instrumental groove.

## Storyboard

### Scene 1 — The Problem Objective — 4.50s (`0.00s–4.50s`)
Eyebrow `THE ASSESSMENT GAP · PROBLEM OBJECTIVE` + headline **"Why conventional coding tests break in the AI era"** with subhead *"Conventional coding tests measure syntax memorization — not how engineers guide AI, debug regressions, or control token spend."* Below, 3 rose-bordered failure cards (`01 Blind to AI Guidance`, `02 Unchecked API Token Burn`, `03 Binary Pass / Fail Grading`) snap in sequentially and hold settled for >2.2s.
Sequential/interaction: Yes — 3 problem objective cards arrive sequentially (`1.09s`, `1.45s`, `1.81s`) and hold dead-still together through `4.35s`.
Audio intent: Establish sharp contrast and urgency around the problem statement.
Audio-coupled idea: Soft impact on hook headline + light card placement cue on the problem-card sequence.
Music: Steady clean instrumental (`vol-12`) enters smoothly.
Transition mood: Clean whip/blur stage swap → Scene 2

### Scene 2 — Sealed AI IDE & Live Token Optimization — 4.79s (`4.50s–9.29s`)
PromptBench header bar (`PromptBench · v2.0`, `Sealed Official Exam · Single-Access`, wall-clock timer `29:42`, `Internal Clipboard Guard`) frames the real 3-pane IDE for `Sliding Window Rate Limiter`. Left pane shows `solution.py · Python 3` with `deque` implementation and green badge `3/3 Public Tests Passed · 14ms`. Right pane shows **Live Token Budget** (`4,580 remaining · +1,180 saved`, `24%` bar), Candidate Turn #1 prompt (`600 tok`), and **Adaptive Context Active** (`Standard → Compact → Ultra-Lean · -45% Tokens`).
Sequential/interaction: Yes — simulated click on `Compress & Send` (`6.00s`) updates the Token Budget bar and pops the `3/3 Public Tests Passed · 14ms` badge (`7.09s`).
Audio intent: Tactile, responsive engineering cockpit feel.
Audio-coupled idea: Crisp UI click when prompt executes + subtle chime when `3/3 Public Tests Passed` turns emerald.
Transition mood: Beat-locked cut at `9.29s` (`strong_beat`) → Scene 3

### Scene 3 — Phase 2 Controlled Bug Injection & Guided Debugging — 4.91s (`9.29s–14.20s`)
Top status strip announces `Phase 1 Complete (100%) → Phase 2 Controlled Bug Injected into Candidate Code`. Left panel shows the deterministic AST/Rule diff inside `solution.py` (`- while accepted and t - accepted[0] >= window:` → `+ while accepted and t - accepted[0] > window:`). Right panel shows `DEBUG TEST FAILED: Exact Window Boundary` (`Expected: [true, true, true]`, `Actual: [true, true, false]`), notes that Guided Debugging blocks lazy *"solve this bug"* prompts, and flips at `12.02s` to `FIXED IN 1 TURN · 5/5 Sandbox Tests Passed` (`beat-locked` settle before `13.11s`).
Sequential/interaction: Yes — diff lines highlight first, then the candidate's targeted boundary diagnosis flips the status card from red `DEBUG TEST FAILED` to emerald `5/5 ALL TESTS PASSED`.
Audio intent: Tension on the injected bug alert followed by clean resolution when the regression is fixed.
Audio-coupled idea: Subtle deep `bong_001` on bug injection (`9.35s`) + crisp click on the targeted debug fix (`12.02s`).
Transition mood: Clean slide/blur swap → Scene 4

### Scene 4 — Explainable 100-Pt Rubric & Governance — 5.46s (`14.20s–19.66s`)
Two-column Evaluator & Admin Governance view. Left card (**Evaluator Review Console**) shows fictional benchmark candidate `Alex Rivera` scoring `92.0 / 100` (`1,420 tok · $0.00029 · 64.8 pts/1K tok`) with the 4 turn-cited rubric bars (`Prompt Quality 37/40`, `Prompt Improvement 9/10`, `Public + Hidden Tests 30/30`, `Debug Regression 16/20`) and one-time locked badge **`DECISION: PASS · LOCKED (VIEW ONLY)`**. Right card (**Admin Governance & Analytics**) shows Invite-Only Access, Evaluator Assignment, **3-Sheet `.XLSX` Export**, and **Candidate Report Released** (`Passed + Written Evaluator Feedback · Numeric Score Hidden`).
Sequential/interaction: Yes — 4 rubric bars fill sequentially, followed by the Admin `Report Released` status pill locking in near `17.47s` / `18.56s`.
Audio intent: Authoritative, audit-ready enterprise confidence.
Audio-coupled idea: Soft UI confirmation cue as `Report Released` badge locks in.
Transition mood: Smooth stage clear → Scene 5

### Scene 5 — Payoff & Live Platform Outro — 4.34s (`19.66s–24.00s`)
Centered hero lockup on PromptBench's architectural dot-grid & emerald glow: CPU icon + **PromptBench** wordmark, pill `Token-Conscious AI Coding Assessment Platform`, verbatim headline **"Measure how engineers guide AI, debug bugs, and optimize tokens"**, 3-stat strip (`40 / 10 / 30 / 20 Rubric` · `-45% Tokens` · `3-Sheet .XLSX`), and CTA badge `promptbench-beta.vercel.app` locking on the `22.37s` / `22.93s` strong cue and holding dead-still to `24.00s`.
Sequential/interaction: Yes — Brand mark, headline, metric strip, and live URL lock in crisp stagger and hold completely still for >2.0s.
Audio intent: Clean, resonant launch finish.
Audio-coupled idea: `impactBell_heavy_000` rings softly on the final brand lock as the music bed fades smoothly underneath.
Transition mood: Hold settled to end (`24.00s`).

**Music mood for this video:** Upbeat, steady, clean executive-tech groove (`vol-12`, 109.96 BPM).
**Audio summary:** A steady 110 BPM instrumental bed carries the narrative from the opening problem-gap hook through tactile IDE, bug-injection, and governance interactions to a clean resonant bell on the final PromptBench lockup.
