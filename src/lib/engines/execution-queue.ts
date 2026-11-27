import { executeTestCases, type ExecutionBatchResult } from "./executor";
import type { SupportedLanguage, TestCase } from "@/types/assessment";

export interface QueuedExecutionResult extends ExecutionBatchResult {
  jobId: string;
  queueWaitMs: number;
  attempts: number;
  queueDepthAtEnqueue: number;
  activeWorkers: number;
}

interface QueueJob {
  id: string;
  enqueuedAt: number;
  queueDepthAtEnqueue: number;
  code: string;
  language: SupportedLanguage;
  testCases: TestCase[];
  resolve: (value: QueuedExecutionResult) => void;
  reject: (reason?: unknown) => void;
}

class BoundedExecutionQueue {
  private readonly maxConcurrency: number;
  private activeCount = 0;
  private totalProcessed = 0;
  private queue: QueueJob[] = [];

  constructor(maxConcurrency = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  public getStats() {
    return {
      maxConcurrency: this.maxConcurrency,
      activeWorkers: this.activeCount,
      pendingJobs: this.queue.length,
      totalProcessed: this.totalProcessed,
    };
  }

  public enqueue(params: {
    code: string;
    language: SupportedLanguage;
    testCases: TestCase[];
  }): Promise<QueuedExecutionResult> {
    const jobId = `job_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    return new Promise<QueuedExecutionResult>((resolve, reject) => {
      this.queue.push({
        id: jobId,
        enqueuedAt: Date.now(),
        queueDepthAtEnqueue: this.queue.length + this.activeCount,
        code: params.code,
        language: params.language,
        testCases: params.testCases,
        resolve,
        reject,
      });
      this.drain();
    });
  }

  private drain() {
    while (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const job = this.queue.shift()!;
      this.activeCount++;
      this.runJob(job).finally(() => {
        this.activeCount--;
        this.totalProcessed++;
        this.drain();
      });
    }
  }

  private async runJob(job: QueueJob) {
    const queueWaitMs = Date.now() - job.enqueuedAt;
    let attempts = 0;
    let lastError: unknown = null;

    // Automatic recovery: up to 2 attempts with short backoff on transient execution failure
    for (let i = 0; i < 2; i++) {
      attempts++;
      try {
        const result = await executeTestCases(
          job.code,
          job.language,
          job.testCases
        );
        job.resolve({
          ...result,
          jobId: job.id,
          queueWaitMs,
          attempts,
          queueDepthAtEnqueue: job.queueDepthAtEnqueue,
          activeWorkers: this.activeCount,
        });
        return;
      } catch (err) {
        lastError = err;
        if (i === 0) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }

    job.reject(lastError);
  }
}

// Singleton queue across server module invocations
const globalForQueue = globalThis as unknown as {
  __promptBenchExecQueue?: BoundedExecutionQueue;
};

export const executionQueue =
  globalForQueue.__promptBenchExecQueue ??
  (globalForQueue.__promptBenchExecQueue = new BoundedExecutionQueue(3));
