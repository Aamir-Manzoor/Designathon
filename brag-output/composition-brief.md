# Hyperframes Composition Brief: PromptBench

## Objective
Create a short launch-style brag video and end-to-end UI solution walkthrough for **PromptBench** that explicitly frames the AI coding assessment problem objective first and demonstrates how PromptBench's UI solves every part of it.

## Output
- Composition directory: `c:\Designathon\brag-output\composition\`
- Rendered video: `c:\Designathon\brag-output\brag.mp4`
- Poster frame: `c:\Designathon\brag-output\brag.jpg` (baked into frame 0)
- Format: landscape — 1920x1080 (30fps)
- Duration: 24s

## Source Material
- Project root: `c:\Designathon`
- Primary files read: `src/app/globals.css`, `src/components/LandingShowcase.tsx`, `src/components/AssessmentWorkspace.tsx`, `src/components/AdminPortal.tsx`, `src/app/profile/page.tsx`
- Product name: PromptBench
- Tagline / strongest claim: "Measure how engineers guide AI, debug bugs, and optimize tokens"
- Key UI or visual moment to recreate:
  1. Problem Objective contrast cards ("Why conventional coding tests break in the AI era")
  2. Sealed 3-pane Assessment IDE (`solution.py` + `Live Token Budget: 4,580 remaining` + `Adaptive Context: Standard / Compact / Ultra-Lean`)
  3. Phase 2 Controlled Bug Injection diff (`>= window` → `> window`) & `DEBUG TEST FAILED: Exact Window Boundary` → `5/5 Sandbox Tests Passed`
  4. Turn-cited `40 / 10 / 30 / 20` 100-Pt Scorecard + Evaluator one-time `PASS` lock + Admin gated score-free `Report Released` + `3-Sheet .XLSX` export
- Copy that must appear verbatim:
  - `Token-Conscious AI Coding Assessment Platform`
  - `Why conventional coding tests break in the AI era`
  - `Measure how engineers guide AI, debug bugs, and optimize tokens`
  - `40 / 10 / 30 / 20` · `Explainable 100-Pt Rubric`
  - `-45% Tokens` · `Adaptive Context Savings`
  - `3-Sheet .XLSX` · `Audit-Ready Scorecards`
  - `Phase 2 — Controlled Bug Injected (Diff)`
  - `DEBUG TEST FAILED: Exact Window Boundary`

## Creative Direction
- Tone preset: `polished`
- Creative direction: Authoritative, crystal-clear product walkthrough connecting the Problem Objective directly to PromptBench's real multi-role UI.
- LOOK: Dark-mode precision engineering telemetry (`#090a0c` canvas, `#111317` crisp 1px-bordered cards, `#10b981` emerald + `#22d3ee` cyan accents, `Outfit`/`Inter` geometric display headlines paired with tabular `JetBrains Mono` code and metrics; fast `expo.out` blur-and-translate arrivals landing dead-still with generous reading holds).
- Angle: Conventional coding tests grade syntax memorization and ignore AI guidance, token burn, and regression debugging — PromptBench tests all three in one sealed, auditable workflow.
- Hook: "Why conventional coding tests break in the AI era" + 3 sharp problem-gap cards in the first 2.5 seconds.
- Outro / punchline: "Measure how engineers guide AI, debug bugs, and optimize tokens." + `promptbench-beta.vercel.app`
- Avoid:
  - Generic SaaS language ("streamline your workflow")
  - Abstract filler visuals or equalizer bars
  - Real personal emails, credentials, or internal database jargon

## Visual Identity
- Background: `#090a0c` (root stage), `#111317` (surface 1), `#171a20` (surface 2), `#0d1117` (code editor)
- Text: `#f8fafc` (primary), `#cbd5e1` (secondary), `#94a3b8` (muted — all verified >= 4.5:1 WCAG AA contrast on dark cards)
- Accent: `#10b981` / `#34d399` (emerald), `#22d3ee` (cyan), `#fbbf24` (amber diff), `#fb7185` (rose error highlight)
- Display font: `Outfit` / `Inter` (HyperFrames bundled geometric sans)
- Body & Code font: `Inter` and `JetBrains Mono` (HyperFrames bundled)
- Visual references from the project: Sticky PromptBench header with CPU badge, 3-pane IDE + Live Token Budget progress bar, Phase 2 red/amber diff lines, 4-bar 100-pt rubric card, Evaluator Pass lock, and Admin Release Report + `.xlsx` export pill.

## Storyboard
Use the storyboard in `c:\Designathon\brag-output\brag-plan.md` as the creative contract.

Scene summary:
1. `s1-problem` (The Problem Objective) — `4.50s` (`0.00s–4.50s`) — Problem headline + 3 conventional-test failure cards (`Blind to AI Guidance`, `Unchecked Token Burn`, `Binary Pass / Fail`).
2. `s2-ide` (Sealed AI IDE & Token Budget) — `4.79s` (`4.50s–9.29s`) — Sealed timed workspace (`29:42`), `solution.py` deque rate limiter, `Live Token Budget` (`4,580 remaining`, `-45% Tokens`), and `3/3 Public Tests Passed · 14ms`.
3. `s3-bug` (Controlled Bug Injection & Debug) — `4.91s` (`9.29s–14.20s`) — Phase 2 surgical diff (`>= window` → `> window`), `DEBUG TEST FAILED: Exact Window Boundary`, Guided Debugging check, and 1-turn fix (`5/5 Sandbox Tests Passed`).
4. `s4-governance` (100-Pt Rubric & Governance) — `5.46s` (`14.20s–19.66s`) — `92.0 / 100` (`40/10/30/20`) turn-cited scorecard for `Alex Rivera`, Evaluator one-time `PASS` lock, `3-Sheet .XLSX` export, and Admin-gated score-free candidate report release.
5. `s5-outro` (Payoff & Live URL) — `4.34s` (`19.66s–24.00s`) — PromptBench brand lockup, verbatim claim, metric strip, and `promptbench-beta.vercel.app`.

## Audio
- Audio role: Steady clean instrumental bed with sparse, low-HF-risk tactile accents.
- Audio arc: Smooth fade-in under the Problem Objective, crisp UI/status cues across the 3 product scenes, resonant final bell over a smooth music fade-out on the brand lockup.
- Music: `assets/music/happy-beats-business-moves-vol-12-by-ende-dot-app.mp3`
- Music treatment: `data-volume="0.32"`, `data-fade-in="0.4"`, `data-fade-out="1.2"` across `0.0s–24.0s`.
- Music cue guidance: Bundled preset `C:\Users\JumboPyDev\.gemini\config\skills\brag\assets\music\cues\happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.json` (109.96 BPM). Strong cue locks: `9.29s` (Scene 3 Bug Injection entrance), `17.47s`/`18.56s` (Scene 4 Governance Release lock), `22.37s` (Scene 5 URL payoff).
- Audio-reactive treatment: Subtle — ambient emerald stage glow (`#bg-glow`) modulates softly on the 109.96 BPM pulse using deterministic GSAP keyframes (no external Python librosa dependency needed, zero equalizer visuals).
- Audio-coupled moments:
  - `0.15s` — Scene 1 Problem Hook entrance (`impactSoft_medium_001.ogg`)
  - `1.09s` — Scene 1 Problem cards sequence start (`card-slide-1.ogg`)
  - `4.50s` — Scene 2 Sealed IDE reveal (`impactSoft_medium_001.ogg`)
  - `6.00s` — Simulated `Compress & Send` action (`click_003.ogg`)
  - `9.29s` — Scene 3 Controlled Bug Injected alert (`bong_001.ogg`)
  - `12.02s` — Targeted Debug Fix applied (`click_003.ogg`)
  - `14.20s` — Scene 4 100-Pt Rubric & Governance reveal (`card-slide-1.ogg`)
  - `17.47s` — Admin `Report Released` lock (`click_003.ogg`)
  - `19.66s` — Scene 5 Outro brand reveal (`impactBell_heavy_000.ogg`)
- SFX analysis guidance: `C:\Users\JumboPyDev\.gemini\config\skills\brag\assets\sfx\sfx-analysis.md` (all chosen SFX are low high-frequency risk).
- Audio files: Copied locally into `c:\Designathon\brag-output\composition\assets\`.
