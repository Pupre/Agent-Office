import { STATUS_META } from "@ai-workflow/shared";

const STAGE_LABELS = {
  planning: "기획",
  coding: "개발",
  testing: "테스트",
  failed: "실패",
  retrying: "재시도",
  review: "리뷰",
  success: "완료"
};

const AGENT_LABELS = {
  planner: "기획자",
  coder: "개발자",
  tester: "테스터",
  reviewer: "리뷰어"
};

export function TimelinePanel({ run }) {
  return (
    <section className="panel timeline-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">타임라인</p>
          <h2>구조화된 이벤트 피드</h2>
        </div>
        <span className="metric-badge">{run.summary.totalEvents}개</span>
      </div>

      <div className="timeline-list">
        {[...run.stageHistory].reverse().map((entry) => (
          <article key={entry.eventId} className="timeline-item">
            <div className={`timeline-dot tone-${entry.status}`} />
            <div className="timeline-copy">
              <div className="timeline-row">
                <strong>{STAGE_LABELS[entry.stageId] ?? entry.stageId}</strong>
                <span>{STATUS_META[entry.status]?.label ?? entry.status}</span>
              </div>
              <p>{entry.summary}</p>
              <small>
                {entry.attempt}차 · {AGENT_LABELS[entry.agentId] ?? entry.agentId} · {STAGE_LABELS[entry.stageId] ?? entry.stageId} ·{" "}
                {new Date(entry.timestamp).toLocaleTimeString()}
              </small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
