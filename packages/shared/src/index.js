export const AGENTS = [
  { id: "planner", role: "기획자", description: "해야 할 일을 실행 가능한 단계로 쪼갭니다." },
  { id: "coder", role: "개발자", description: "코드를 구현하고 수정 패치를 만듭니다." },
  { id: "tester", role: "테스터", description: "동작을 검증하고 실패 원인을 보고합니다." },
  { id: "reviewer", role: "리뷰어", description: "결과 품질을 확인하고 마무리 판단을 내립니다." }
];

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((agent) => [agent.id, agent]));

export const ROOMS = [
  {
    id: "briefing-room",
    label: "브리핑룸",
    description: "목표 정렬, 범위 조정, 작업 분해가 이루어지는 공간.",
    accent: "planning"
  },
  {
    id: "build-bay",
    label: "개발 구역",
    description: "구현, 패치 작성, 다음 단계 인계 준비를 진행합니다.",
    accent: "coding"
  },
  {
    id: "qa-lab",
    label: "QA 랩",
    description: "검증, 회귀 확인, 깨진 흐름 탐지를 맡습니다.",
    accent: "testing"
  },
  {
    id: "incident-desk",
    label: "장애 대응석",
    description: "실패 분석, 재시도 계획, 원인 점검을 처리합니다.",
    accent: "failed"
  },
  {
    id: "review-desk",
    label: "리뷰 데스크",
    description: "최종 판단, 마감 다듬기, 완료 결정을 내립니다.",
    accent: "success"
  }
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((room) => [room.id, room]));

export const WORKFLOW_STATUSES = [
  "planning",
  "coding",
  "testing",
  "failed",
  "retrying",
  "success"
];

export const EVENT_TYPES = {
  RUN_CREATED: "run.created",
  RUN_STARTED: "run.started",
  RUN_COMPLETED: "run.completed",
  STAGE_STARTED: "stage.started",
  STAGE_COMPLETED: "stage.completed",
  STAGE_FAILED: "stage.failed",
  AGENT_ASSIGNED: "agent.assigned",
  LOG_APPENDED: "log.appended",
  DISCUSSION_MESSAGE: "discussion.message",
  ANALYSIS_RECORDED: "analysis.recorded",
  HANDOFF_COMPLETED: "handoff.completed"
};

export const STATUS_META = {
  idle: { label: "대기", tone: "idle" },
  waiting: { label: "대기 중", tone: "waiting" },
  planning: { label: "기획 중", tone: "planning" },
  coding: { label: "개발 중", tone: "coding" },
  testing: { label: "테스트 중", tone: "testing" },
  failed: { label: "실패", tone: "failed" },
  retrying: { label: "재시도 중", tone: "retrying" },
  success: { label: "완료", tone: "success" }
};

export function createRunSnapshot(runId, title = "AI 코딩 오케스트레이션 시각화") {
  return {
    runId,
    title,
    overallStatus: "planning",
    currentAgentId: "planner",
    currentStageId: "planning",
    currentRoomId: "briefing-room",
    activeAgentIds: ["planner"],
    attempt: 1,
    lastUpdatedAt: null,
    events: [],
    agentStatuses: AGENTS.map((agent) => ({
      ...agent,
      status: agent.id === "planner" ? "planning" : "idle",
      active: agent.id === "planner",
      roomId: agent.id === "planner" ? "briefing-room" : "lobby",
      lastEventAt: null
    })),
    stageHistory: [],
    logs: [],
    discussion: [],
    summary: {
      totalEvents: 0,
      failures: 0,
      retries: 0
    }
  };
}

export function createWorkflowEvent({
  runId,
  sequence,
  kind,
  type,
  task,
  stage,
  room,
  agent,
  payload = {}
}) {
  return {
    id: `evt_${runId}_${sequence}`,
    runId,
    sequence,
    timestamp: new Date().toISOString(),
    kind,
    type,
    task,
    stage,
    room,
    agent,
    payload
  };
}

export function applyEvent(snapshot, event) {
  const teamState = event.payload?.teamState;
  const activeAgentIds =
    teamState?.activeAgentIds ??
    (event.agent?.id ? [event.agent.id] : snapshot.activeAgentIds ?? []);
  const next = {
    ...snapshot,
    events: [...snapshot.events, event].slice(-60),
    lastUpdatedAt: event.timestamp,
    activeAgentIds,
    summary: {
      ...snapshot.summary,
      totalEvents: snapshot.summary.totalEvents + 1
    },
    agentStatuses: snapshot.agentStatuses.map((agent) => ({
      ...agent,
      active: activeAgentIds.includes(agent.id),
      lastEventAt: event.agent?.id === agent.id ? event.timestamp : agent.lastEventAt
    }))
  };

  if (event.stage?.status) {
    next.overallStatus = event.stage.status;
    next.currentStageId = event.stage.id;
    next.attempt = event.stage.attempt ?? next.attempt;
  }

  if (event.room?.id) {
    next.currentRoomId = event.room.id;
  }

  if (event.agent?.id) {
    next.currentAgentId = event.agent.id;
    next.agentStatuses = next.agentStatuses.map((agent) => {
      const assignedRoomId =
        teamState?.assignments?.[agent.id] ??
        agent.roomId;
      const assignedStatus =
        teamState?.statuses?.[agent.id] ??
        agent.status;

      if (agent.id === event.agent.id) {
        return {
          ...agent,
          status: teamState?.statuses?.[agent.id] ?? event.stage?.status ?? assignedStatus,
          active: activeAgentIds.includes(agent.id),
          roomId: teamState?.assignments?.[agent.id] ?? event.room?.id ?? assignedRoomId,
          lastEventAt: event.timestamp
        };
      }

      if (event.type === EVENT_TYPES.RUN_COMPLETED) {
        return { ...agent, status: "idle", active: false, roomId: assignedRoomId };
      }

      return {
        ...agent,
        active: activeAgentIds.includes(agent.id),
        status: assignedStatus,
        roomId: assignedRoomId
      };
    });
  }

  if (event.type === EVENT_TYPES.STAGE_STARTED || event.type === EVENT_TYPES.STAGE_COMPLETED || event.type === EVENT_TYPES.STAGE_FAILED) {
    next.stageHistory = [
      ...snapshot.stageHistory,
      {
        eventId: event.id,
        type: event.type,
        stageId: event.stage?.id,
        status: event.stage?.status,
        attempt: event.stage?.attempt,
        agentId: event.agent?.id,
        summary: event.payload?.summary ?? "",
        timestamp: event.timestamp
      }
    ].slice(-20);
  }

  if (event.type === EVENT_TYPES.LOG_APPENDED || event.kind === "log") {
    next.logs = [
      ...snapshot.logs,
      {
        eventId: event.id,
        stageId: event.stage?.id,
        status: event.stage?.status,
        attempt: event.stage?.attempt,
        agentId: event.agent?.id,
        summary: event.payload?.summary ?? "",
        timestamp: event.timestamp
      }
    ].slice(-20);
  }

  if (
    event.type === EVENT_TYPES.DISCUSSION_MESSAGE ||
    event.type === EVENT_TYPES.ANALYSIS_RECORDED ||
    event.type === EVENT_TYPES.HANDOFF_COMPLETED
  ) {
    next.discussion = [
      ...snapshot.discussion,
      {
        eventId: event.id,
        type: event.type,
        roomId: event.room?.id,
        roomLabel: event.room?.label,
        agentId: event.agent?.id,
        role: event.agent?.role,
        summary: event.payload?.summary ?? "",
        detail: event.payload?.detail ?? "",
        timestamp: event.timestamp
      }
    ].slice(-24);
  }

  if (event.type === EVENT_TYPES.STAGE_FAILED) {
    next.summary.failures += 1;
  }

  if (event.stage?.status === "retrying") {
    next.summary.retries += 1;
  }

  if (event.type === EVENT_TYPES.RUN_COMPLETED) {
    next.overallStatus = "success";
    next.currentStageId = "success";
    next.activeAgentIds = [];
    next.agentStatuses = next.agentStatuses.map((agent) => ({
      ...agent,
      active: false,
      status: agent.id === event.agent?.id ? "success" : "idle"
    }));
  }

  return next;
}

export function replayEvents(events, baseSnapshot) {
  return events.reduce((snapshot, event) => applyEvent(snapshot, event), baseSnapshot);
}

export function getAgentIndex(agentId) {
  return Math.max(
    0,
    AGENTS.findIndex((agent) => agent.id === agentId)
  );
}

export function getRoomIndex(roomId) {
  return Math.max(
    0,
    ROOMS.findIndex((room) => room.id === roomId)
  );
}

export function sortRunsByUpdatedAt(runs) {
  return [...runs].sort((left, right) => {
    const leftTime = left.lastUpdatedAt ? Date.parse(left.lastUpdatedAt) : 0;
    const rightTime = right.lastUpdatedAt ? Date.parse(right.lastUpdatedAt) : 0;
    return rightTime - leftTime;
  });
}
