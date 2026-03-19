import { STATUS_META, applyEvent, createRunSnapshot, sortRunsByUpdatedAt } from "@ai-workflow/shared";
import { createMockExecutor, createOpenAIResponsesExecutor } from "./executors.js";

export function createWorkflowStore() {
  const runs = new Map();

  return {
    getRun(runId) {
      return runs.get(runId) ?? null;
    },
    getAllRuns() {
      return sortRunsByUpdatedAt([...runs.values()]);
    },
    getLatestRun() {
      return this.getAllRuns()[0] ?? null;
    },
    update(event) {
      const current = runs.get(event.runId) ?? createRunSnapshot(event.runId, event.task?.title);
      const next = applyEvent(current, event);
      runs.set(event.runId, next);
      return next;
    },
    createRun(runId, title) {
      const snapshot = createRunSnapshot(runId, title);
      runs.set(runId, snapshot);
      return snapshot;
    }
  };
}

const EXECUTOR_FACTORIES = {
  mock: () => createMockExecutor(),
  openai: () => createOpenAIResponsesExecutor()
};

export function createOrchestrator(eventBus, store, executorFactory = EXECUTOR_FACTORIES.mock) {
  let runSequence = 0;
  const activeExecutions = new Map();

  return {
    async startRun(options = {}) {
      runSequence += 1;
      const runId = `run_${String(runSequence).padStart(4, "0")}`;
      const title = options.title || "AI 코딩 오케스트레이션 시각화";
      const executor = (options.executor === "openai" ? EXECUTOR_FACTORIES.openai : executorFactory)();
      const snapshot = store.createRun(runId, title);

      const execution = executor.execute({
        runId,
        title,
        options,
        eventBus,
        store
      }).finally(() => {
        activeExecutions.delete(runId);
      });

      activeExecutions.set(runId, execution);
      return {
        runId,
        snapshot,
        executor: executor.id
      };
    },
    getRun(runId) {
      return store.getRun(runId);
    },
    getLatestRun() {
      return store.getLatestRun();
    },
    listRuns() {
      return store.getAllRuns();
    },
    isRunning(runId) {
      return activeExecutions.has(runId);
    },
    getStatusCatalog() {
      return STATUS_META;
    },
    getExecutorMeta() {
      return {
        defaultExecutor: executorFactory().id,
        availableExecutors: Object.keys(EXECUTOR_FACTORIES),
        activeRunCount: activeExecutions.size
      };
    }
  };
}
