# Agent Office

Kairosoft-inspired office sim for visualizing an AI coding workflow in real time.

Instead of a plain log viewer, this project turns workflow events into a live office scene where planners, developers, testers, and reviewers move through briefing rooms, build bays, QA labs, and incident desks.

## What it does

- React + canvas office scene with moving agent characters
- real event-driven workflow rendering, not a fake animation loop
- SSE-based live updates from the backend
- Codex session mirroring for "show me the work happening right now"
- mock orchestration path for demo runs
- shared event schema so new adapters can plug in later

## Workspace structure

```text
agent-office/
├─ apps/
│  ├─ server/      # event bus, in-memory run store, SSE API, Codex mirror
│  └─ web/         # React app + canvas office scene
├─ packages/
│  └─ shared/      # event schema, agent metadata, reducer helpers
├─ package.json    # npm workspace root
└─ README.md
```

## Runtime requirements

Tested in this environment:

- Node.js: `v24.13.0`
- npm: `11.11.0`
- Python: `3.9.16`

Notes:

- Python is not required for the app itself right now.
- The project currently runs on Node.js ESM and Vite. Staying on a recent Node 20+ or Node 22+/24+ environment is the safe choice.

## Install

From the project root:

```bash
cd /home/muhyeon_shin/packages/ai-workflow-visualizer
npm install
```

## Windows setup

Recommended installs on Windows:

- Git for Windows
- Node.js 22+ or 24+
- npm comes with Node.js
- VS Code optional

Links:

- Git for Windows: `https://git-scm.com/download/win`
- Node.js: `https://nodejs.org/`
- VS Code: `https://code.visualstudio.com/`

PowerShell setup flow:

```powershell
git clone https://github.com/Pupre/Agent-Office.git
cd Agent-Office
npm install
```

Run the server in one PowerShell window:

```powershell
npm run start:server
```

Run the web app in another PowerShell window:

```powershell
npm run dev:web
```

Open:

- web: `http://127.0.0.1:5173`
- server: `http://127.0.0.1:8787`

Notes for Windows:

- Python is not required for the current app flow.
- If `npm` is not recognized, reopen PowerShell after installing Node.js.
- If port `8787` or `5173` is already in use, close the existing process first.
- The live Codex mirror only works if the Codex log/history files exist on that Windows machine too.

## Run locally

Start the API/SSE server:

```bash
npm run start:server
```

Start the web app in another terminal:

```bash
npm run dev:web
```

Default local endpoints:

- web: `http://127.0.0.1:5173`
- server: `http://127.0.0.1:8787`

If you want a production web build preview instead of Vite dev mode:

```bash
npm run build:web
```

## Main scripts

- `npm run dev:web`
- `npm run build:web`
- `npm run dev:server`
- `npm run start:server`

## Current interaction modes

### 1. Codex live mirror

This mode mirrors the current Codex session into the office scene.

Current implementation:

- reads `~/.codex/history.jsonl`
- reads `~/.codex/log/codex-tui.log`
- interprets observable actions into planner / developer / tester / reviewer activity

Important limitation:

- this is not reading hidden internal reasoning
- it visualizes observable work plus summarized role-level behavior

### 2. Mock orchestration

Useful for standalone demo runs when you want a fully scripted multi-step workflow.

## API overview

- `GET /health`
- `GET /api/runs`
- `GET /api/runs/current`
- `POST /api/runs`
- `GET /api/events`
- `GET /api/mirrors/codex/state`
- `GET /api/mirrors/codex/sessions`
- `POST /api/mirrors/codex/latest`

## Event model

All runtime messages use the same shared event envelope from `packages/shared`.

```js
{
  id: "evt_...",
  runId: "codex_...",
  sequence: 42,
  timestamp: "2026-03-19T12:34:56.000Z",
  kind: "run" | "stage" | "discussion" | "log",
  type: "run.started" | "discussion.message" | "log.appended" | ...,
  task: {
    id: "task_codex_live",
    title: "실시간 Codex 세션 019d0484"
  },
  stage: {
    id: "testing",
    status: "testing",
    attempt: 1,
    index: 7
  },
  agent: {
    id: "coder-2",
    role: "개발자"
  },
  payload: {
    summary: "검증 명령 실행: npm run build:web",
    detail: "npm run build:web",
    teamState: {
      activeAgentIds: ["coder-1", "coder-2", "tester-1"],
      assignments: {
        "coder-1": "build-bay",
        "coder-2": "qa-lab"
      },
      statuses: {
        "coder-1": "coding",
        "coder-2": "testing"
      }
    }
  }
}
```

## Housekeeping before continuing at home

Recommended flow:

```bash
cd /home/muhyeon_shin/packages/ai-workflow-visualizer
git pull
npm install
npm run start:server
npm run dev:web
```

If dependencies are already installed, `npm install` can be skipped.

## Git remote

Current remote:

```bash
https://github.com/Pupre/Agent-Office.git
```

If you need to push manually:

```bash
cd /home/muhyeon_shin/packages/ai-workflow-visualizer
git push origin main
```

## Next likely improvements

- richer worker personalities and pair dynamics
- better speech bubble prioritization
- more native multi-agent adapters beyond Codex
- tighter mapping from real tool actions to office behaviors
