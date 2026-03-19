# Agent Office

Event-driven MVP for visualizing an AI coding workflow as if a small agent team is collaborating in real time.

## Folder structure

```text
agent-office/
├─ apps/
│  ├─ server/   # orchestration loop, in-memory run store, SSE API
│  └─ web/      # React dashboard consuming live workflow events
├─ packages/
│  └─ shared/   # event schema, agent/stage metadata, reducer helpers
└─ README.md
```

## Event schema

All runtime messages use the same envelope:

```js
{
  id: "evt_...",
  runId: "run_...",
  sequence: 7,
  timestamp: "2026-03-19T12:34:56.000Z",
  kind: "run" | "stage" | "agent" | "log",
  type: "run.created" | "stage.started" | "stage.failed" | ...,
  task: {
    id: "task_primary",
    title: "Implement live event pipeline"
  },
  stage: {
    id: "testing",
    status: "testing",
    attempt: 1,
    index: 2
  },
  agent: {
    id: "tester",
    role: "Tester"
  },
  payload: {
    summary: "Tests failed on websocket reconnect edge case",
    nextStageId: "coding"
  }
}
```

The `packages/shared` module owns:

- canonical agent definitions
- workflow status values
- event type constants
- reducer logic that converts an event stream into a run snapshot

This keeps the backend and frontend synchronized without duplicating state rules.

## Data flow

1. `POST /api/runs` creates a new run and starts the orchestrator.
2. The orchestrator emits structured events at each stage transition.
3. The event bus fans those events out to:
   - the in-memory run store
   - connected SSE clients on `/api/events`
4. The React app:
   - fetches the run list from `/api/runs`
   - opens an `EventSource` connection
   - incrementally applies incoming events to render agent cards, task movement, the timeline, and run queue updates

Because the UI is driven by the same event contract a real executor would use, the mock loop can later be replaced with actual LLM/tool calls without changing the rendering model.

## MVP scope in this commit

- in-memory orchestration loop with retry path
- pluggable executor contract so mock logic can be replaced by real workers
- multi-run in-memory store with list and detail APIs
- SSE event streaming
- React dashboard with live agent board, moving task indicator, run queue, logs, and timeline
- shared event contract for future replacement with real executors

## Executors

- `mock`: emits a full collaborative loop with planning discussion, coding handoff, QA failure, root-cause analysis, retry, and review.
- `openai`: uses the OpenAI `POST /v1/responses` API shape as the integration point for a real model-backed planner pass.

Environment variables for the OpenAI executor:

- `OPENAI_API_KEY`
- `AI_WORKFLOW_MODEL` default: `gpt-5.4`
