import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { executionQueue } from "@/lib/engines/execution-queue";
import type { TestCase } from "@/types/assessment";

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    concurrency?: number;
  };
  const count = Math.min(12, Math.max(2, Number(body.concurrency) || 6));

  const sampleCode = [
    "import sys, json",
    "from collections import deque",
    "data = json.loads(sys.stdin.read())",
    "q, out = deque(), []",
    "for t in data['requests']:",
    "    while q and t - q[0] >= data['window']: q.popleft()",
    "    if len(q) < data['limit']: q.append(t); out.append(True)",
    "    else: out.append(False)",
    "print(json.dumps(out))",
  ].join("\n");

  const sampleTests: TestCase[] = [
    {
      id: "conc-1",
      challenge_id: "conc",
      name: "Concurrency Burst",
      input: '{"limit":2,"window":10,"requests":[1,2,3,11,12]}',
      expected_output: "[true, true, false, true, true]",
      visibility: "public",
      weight: 1,
      sort_order: 1,
    },
  ];

  const t0 = Date.now();
  const jobs = await Promise.all(
    Array.from({ length: count }, (_, idx) =>
      executionQueue
        .enqueue({
          code: sampleCode,
          language: "python",
          testCases: sampleTests,
        })
        .then((res) => ({
          worker_index: idx + 1,
          job_id: res.jobId,
          engine: res.engine,
          passed: res.passedCount === res.totalCount,
          queue_wait_ms: res.queueWaitMs,
          runtime_ms: res.runtimeMs,
          attempts: res.attempts,
        }))
    )
  );
  const totalWallMs = Date.now() - t0;

  const latencies = jobs.map((j) => j.runtime_ms + j.queue_wait_ms).sort((a, b) => a - b);
  const p95 = latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95))];
  const maxQueueWait = Math.max(...jobs.map((j) => j.queue_wait_ms));
  const passedJobs = jobs.filter((j) => j.passed).length;

  return NextResponse.json({
    dispatched: count,
    completed: jobs.length,
    passed: passedJobs,
    total_wall_ms: totalWallMs,
    max_queue_wait_ms: maxQueueWait,
    p95_latency_ms: p95,
    queue_stats: executionQueue.getStats(),
    jobs,
  });
}
