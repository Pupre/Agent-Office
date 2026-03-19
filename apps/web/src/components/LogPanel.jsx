const STAGE_LABELS = {
  planning: "기획",
  coding: "개발",
  testing: "테스트",
  failed: "실패",
  retrying: "재시도",
  review: "리뷰",
  success: "완료"
};

export function LogPanel({ run }) {
  return (
    <section className="panel log-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">실행 로그</p>
          <h2>엔진 출력</h2>
        </div>
        <span className="metric-badge">{run.logs.length}개</span>
      </div>

      <div className="log-list">
        {[...run.logs].reverse().map((entry) => (
          <article key={entry.eventId} className="log-item">
            <div className="log-item-top">
              <strong>{AGENT_LABEL_BY_ID[entry.agentId] ?? entry.agentId}</strong>
              <span>{STAGE_LABELS[entry.stageId] ?? entry.stageId}</span>
            </div>
            <p>{entry.summary}</p>
            <small>
              {entry.attempt}차 · {new Date(entry.timestamp).toLocaleTimeString()}
            </small>
          </article>
        ))}
      </div>
    </section>
  );
}
import { AGENT_LABEL_BY_ID } from "@ai-workflow/shared";
