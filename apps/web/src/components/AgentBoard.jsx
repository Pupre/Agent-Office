import { ROOMS, STATUS_META } from "@ai-workflow/shared";
import { OfficeSceneCanvas } from "./OfficeSceneCanvas.jsx";

const AGENT_VISUALS = {
  planner: { badge: "PL", accent: "planner", name: "민아" },
  coder: { badge: "CD", accent: "coder", name: "재우" },
  tester: { badge: "QA", accent: "tester", name: "노아" },
  reviewer: { badge: "RV", accent: "reviewer", name: "이라" }
};

export function AgentBoard({ run }) {
  const latestMessages = [...run.discussion].slice(-3).reverse();
  const roomLabelById = Object.fromEntries(ROOMS.map((room) => [room.id, room.label]));

  return (
    <section className="office-scene panel">
      <div className="office-scene-header">
        <div>
          <p className="eyebrow">오피스 플로어</p>
          <h2>AI 팀 사무실</h2>
        </div>
        <div className={`status-pill tone-${run.overallStatus}`}>
          {STATUS_META[run.overallStatus]?.label ?? run.overallStatus}
        </div>
      </div>

      <div className="scene-frame">
        <OfficeSceneCanvas run={run} rooms={ROOMS} />
      </div>

      <div className="office-stage-footer">
        <div className="office-roster">
          {run.agentStatuses.map((agent) => (
            <article
              key={agent.id}
              className={`roster-card ${agent.id === run.currentAgentId ? "is-active" : ""}`}
            >
              <div className="roster-meta">
                <span className={`roster-chip avatar-${AGENT_VISUALS[agent.id].accent}`}>
                  {AGENT_VISUALS[agent.id].badge}
                </span>
                <strong>{AGENT_VISUALS[agent.id].name}</strong>
              </div>
              <small>{agent.role}</small>
              <span className={`agent-state tone-${agent.status}`}>
                {STATUS_META[agent.status]?.label ?? agent.status}
              </span>
              <small>{roomLabelById[agent.roomId] ?? agent.roomId}</small>
            </article>
          ))}
        </div>

        <div className="conversation-strip">
          {latestMessages.map((entry) => (
            <article key={entry.eventId} className="conversation-card">
              <div className="conversation-meta">
                <span>{entry.role}</span>
                <span>{entry.roomLabel}</span>
              </div>
              <p>{entry.summary}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
