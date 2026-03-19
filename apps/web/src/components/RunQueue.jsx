import { STATUS_META } from "@ai-workflow/shared";

export function RunQueue({ runs, selectedRunId, onSelectRun }) {
  return (
    <section className="panel queue-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">실행 목록</p>
          <h2>워크플로우 인스턴스</h2>
        </div>
        <span className="metric-badge">{runs.length}개</span>
      </div>

      <div className="run-list">
        {runs.map((run) => (
          <button
            key={run.runId}
            className={`run-row ${selectedRunId === run.runId ? "is-selected" : ""}`}
            onClick={() => onSelectRun(run.runId)}
            type="button"
          >
            <div className="run-row-top">
              <strong>{run.title}</strong>
              <span className={`status-pill tone-${run.overallStatus}`}>
                {STATUS_META[run.overallStatus]?.label ?? run.overallStatus}
              </span>
            </div>
            <div className="run-row-meta">
              <span>{run.runId}</span>
              <span>{run.attempt}차 시도</span>
              <span>이벤트 {run.summary.totalEvents}개</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
