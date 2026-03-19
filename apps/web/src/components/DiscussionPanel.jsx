export function DiscussionPanel({ run }) {
  return (
    <section className="panel discussion-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">대화 기록</p>
          <h2>팀이 지금 나누는 말</h2>
        </div>
        <span className="metric-badge">{run.discussion.length}개</span>
      </div>

      <div className="discussion-list">
        {[...run.discussion].reverse().map((entry) => (
          <article key={entry.eventId} className="discussion-item">
            <div className="discussion-item-top">
              <strong>{entry.role}</strong>
              <span>{entry.roomLabel}</span>
            </div>
            <p>{entry.summary}</p>
            {entry.detail ? <small>{entry.detail}</small> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
