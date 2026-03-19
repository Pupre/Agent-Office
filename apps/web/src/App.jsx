import { useEffect, useState } from "react";
import {
  STATUS_META,
  applyEvent,
  createRunSnapshot,
  sortRunsByUpdatedAt
} from "@ai-workflow/shared";
import { AgentBoard } from "./components/AgentBoard.jsx";
import { DiscussionPanel } from "./components/DiscussionPanel.jsx";
import { LogPanel } from "./components/LogPanel.jsx";
import { RunQueue } from "./components/RunQueue.jsx";
import { TimelinePanel } from "./components/TimelinePanel.jsx";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";

const EXECUTOR_LABELS = {
  mock: "모의 팀 루프",
  openai: "OpenAI 실행기"
};

function MetricCard({ label, value, tone }) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function App() {
  const [runs, setRuns] = useState([]);
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [executorMeta, setExecutorMeta] = useState({
    defaultExecutor: "mock-collaboration-loop",
    availableExecutors: ["mock", "openai"]
  });
  const [executorChoice, setExecutorChoice] = useState("mock");
  const [codexMirror, setCodexMirror] = useState(null);
  const [codexSessions, setCodexSessions] = useState([]);
  const [selectedCodexSessionId, setSelectedCodexSessionId] = useState("");

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/schema`)
      .then((response) => response.json())
      .then((data) => {
        if (data.executor) {
          setExecutorMeta(data.executor);
        }
        if (data.codexMirror) {
          setCodexMirror(data.codexMirror);
          setSelectedCodexSessionId(
            data.codexMirror.attachedSessionId ?? data.codexMirror.sessionId ?? ""
          );
        }
      });

    fetch(`${API_BASE_URL}/api/mirrors/codex/sessions`)
      .then((response) => response.json())
      .then((data) => {
        if (data.sessions?.length) {
          setCodexSessions(data.sessions);
          setSelectedCodexSessionId((current) => current || data.sessions[0].sessionId);
        }
      });

    fetch(`${API_BASE_URL}/api/runs`)
      .then((response) => response.json())
      .then((data) => {
        if (data.runs?.length) {
          setRuns(data.runs);
          setSelectedRunId((current) => current ?? data.runs[0].runId);
        }
      })
      .finally(() => {
        setBootstrapped(true);
      });

    const source = new EventSource(`${API_BASE_URL}/api/events`);

    source.addEventListener("ready", () => {
      setConnected(true);
    });

    source.onmessage = (message) => {
      const event = JSON.parse(message.data);
      setRuns((currentRuns) => {
        const existingRun = currentRuns.find((run) => run.runId === event.runId);
        const base = existingRun ?? createRunSnapshot(event.runId, event.task?.title);
        const nextRuns = currentRuns.filter((run) => run.runId !== event.runId);
        return sortRunsByUpdatedAt([...nextRuns, applyEvent(base, event)]);
      });
      setSelectedRunId((current) => current ?? event.runId);
    };

    source.onerror = () => {
      setConnected(false);
    };

    return () => {
      source.close();
    };
  }, []);

  const run =
    runs.find((item) => item.runId === selectedRunId) ??
    runs[0] ??
    createRunSnapshot("run_pending");
  const statusLabel = STATUS_META[run.overallStatus]?.label ?? run.overallStatus;

  const metrics = [
    { label: "현재 상태", value: statusLabel, tone: run.overallStatus },
    { label: "시도 횟수", value: `${run.attempt}회`, tone: "planning" },
    { label: "실패 수", value: `${run.summary.failures}건`, tone: "failed" },
    { label: "재시도 수", value: `${run.summary.retries}건`, tone: "retrying" }
  ];

  async function startDemoRun() {
    const response = await fetch(`${API_BASE_URL}/api/runs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "AI 코딩 오케스트레이션 시각화",
        executor: executorChoice
      })
    });
    const data = await response.json();
    if (data.runId) {
      setSelectedRunId(data.runId);
    }
  }

  async function attachCurrentCodexSession() {
    const response = await fetch(`${API_BASE_URL}/api/mirrors/codex/latest`, {
      method: "POST"
    });
    const data = await response.json();
    if (data.mirror) {
      setCodexMirror({ ...data.mirror, attached: true });
      if (data.mirror.runId) {
        const runsResponse = await fetch(`${API_BASE_URL}/api/runs`);
        const runsData = await runsResponse.json();
        if (runsData.runs?.length) {
          setRuns(runsData.runs);
        }
        setSelectedRunId(data.mirror.runId);
      }
    }
  }

  async function attachSelectedCodexSession() {
    if (!selectedCodexSessionId) {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/mirrors/codex/attach`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId: selectedCodexSessionId
      })
    });
    const data = await response.json();
    if (data.mirror) {
      setCodexMirror({ ...data.mirror, attached: true, attachedSessionId: selectedCodexSessionId });
      const runsResponse = await fetch(`${API_BASE_URL}/api/runs`);
      const runsData = await runsResponse.json();
      if (runsData.runs?.length) {
        setRuns(runsData.runs);
      }
      setSelectedRunId(data.mirror.runId);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero office-hero">
        <div>
          <p className="eyebrow">AI 오피스 시뮬레이션</p>
          <h1>AI 직원들이 일하는 장면</h1>
          <p className="hero-copy">
            기획, 개발, 테스트, 장애 분석, 리뷰가 한 사무실 안에서 동시에 벌어지고,
            각 이벤트가 실제 오케스트레이션 상태를 그대로 화면에 드러내는 작업장입니다.
          </p>
        </div>
        <div className="hero-actions">
          <div className="hero-controls">
            <label className="executor-picker">
              <span>실행 엔진</span>
              <select
                value={executorChoice}
                onChange={(event) => setExecutorChoice(event.target.value)}
              >
                {executorMeta.availableExecutors.map((executorId) => (
                  <option key={executorId} value={executorId}>
                    {EXECUTOR_LABELS[executorId] ?? executorId}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" onClick={startDemoRun}>
              데모 실행
            </button>
            <button className="secondary-button" onClick={attachCurrentCodexSession}>
              현재 Codex 세션 연결
            </button>
            <label className="executor-picker codex-session-picker">
              <span>Codex 세션</span>
              <select
                value={selectedCodexSessionId}
                onChange={(event) => setSelectedCodexSessionId(event.target.value)}
              >
                {codexSessions.map((session) => (
                  <option key={session.sessionId} value={session.sessionId}>
                    {session.sessionId.slice(0, 8)} · {session.lastPrompt?.slice(0, 24) || "프롬프트 없음"}
                  </option>
                ))}
              </select>
            </label>
            <button className="secondary-button" onClick={attachSelectedCodexSession}>
              선택 세션 연결
            </button>
          </div>
          <div className={`connection-chip ${connected ? "is-live" : ""}`}>
            <span className="connection-dot" />
            {connected ? "실시간 연결됨" : bootstrapped ? "다시 연결 중" : "연결 중"}
          </div>
          {codexMirror?.sessionId ? (
            <div className="connection-chip is-live">
              Codex 세션 {codexMirror.sessionId.slice(0, 8)}
            </div>
          ) : null}
        </div>
      </section>

      <section className="office-layout">
        <section className="scene-column">
          <AgentBoard run={run} />
        </section>

        <aside className="control-column">
          <RunQueue
            runs={runs}
            selectedRunId={selectedRunId}
            onSelectRun={setSelectedRunId}
          />

          <section className="metrics-grid compact-metrics">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>
        </aside>
      </section>

      <section className="inspector-grid">
        <TimelinePanel run={run} />
        <DiscussionPanel run={run} />
        <LogPanel run={run} />
      </section>
    </main>
  );
}
