import {
  AGENT_BY_ID,
  EVENT_TYPES,
  ROOM_BY_ID,
  createWorkflowEvent
} from "@ai-workflow/shared";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createExecutionHelpers({ eventBus, store, runId, title }) {
  const sequenceRef = { value: 1 };

  const emit = ({
    kind,
    type,
    agentId,
    roomId,
    stageId,
    status,
    attempt,
    summary,
    detail,
    extraPayload = {}
  }) => {
    const event = createWorkflowEvent({
      runId,
      sequence: sequenceRef.value++,
      kind,
      type,
      task: {
        id: "task_primary",
        title
      },
      stage: {
        id: stageId,
        status,
        attempt,
        index: sequenceRef.value - 1
      },
      room: ROOM_BY_ID[roomId],
      agent: AGENT_BY_ID[agentId],
      payload: {
        summary,
        detail,
        ...extraPayload
      }
    });

    store.update(event);
    eventBus.publish(event);
    return event;
  };

  return {
    wait,
    emitRun(event) {
      return emit({ kind: "run", ...event });
    },
    emitStage(event) {
      return emit({ kind: "stage", ...event });
    },
    emitAgent(event) {
      return emit({ kind: "agent", ...event });
    },
    emitLog(event) {
      return emit({ kind: "log", ...event });
    },
    emitDiscussion(event) {
      return emit({ kind: "discussion", ...event });
    },
    teamState(assignments, statuses) {
      const activeAgentIds = Object.entries(statuses)
        .filter(([, status]) => !["idle", "waiting"].includes(status))
        .map(([agentId]) => agentId);

      return {
        teamState: {
          activeAgentIds,
          assignments,
          statuses
        }
      };
    }
  };
}

export function createMockExecutor() {
  return {
    id: "mock-collaboration-loop",
    async execute({ runId, title, eventBus, store }) {
      const io = createExecutionHelpers({ eventBus, store, runId, title });

      io.emitRun({
        type: EVENT_TYPES.RUN_CREATED,
        agentId: "planner",
        roomId: "briefing-room",
        stageId: "planning",
        status: "planning",
        attempt: 1,
        summary: "실행 세션이 생성되었습니다",
        detail: "워크플로우 세션이 열리고 팀이 작업 주위로 모였습니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "lobby", tester: "lobby", reviewer: "briefing-room" },
          { planner: "planning", coder: "idle", tester: "idle", reviewer: "planning" }
        )
      });
      await io.wait(180);

      io.emitDiscussion({
        type: EVENT_TYPES.DISCUSSION_MESSAGE,
        agentId: "planner",
        roomId: "briefing-room",
        stageId: "planning",
        status: "planning",
        attempt: 1,
        summary: "가짜 애니메이션이 아니라 제품 수준의 실시간 워크플로우 화면이 필요합니다.",
        detail: "기획자가 보이는 모든 상태가 오케스트레이션 이벤트에서 나오도록 목표를 정리합니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "briefing-room", tester: "briefing-room", reviewer: "briefing-room" },
          { planner: "planning", coder: "planning", tester: "planning", reviewer: "planning" }
        )
      });
      await io.wait(260);

      io.emitDiscussion({
        type: EVENT_TYPES.DISCUSSION_MESSAGE,
        agentId: "reviewer",
        roomId: "briefing-room",
        stageId: "planning",
        status: "planning",
        attempt: 1,
        summary: "실패는 숨기지 말고 보여줘야 합니다. 원인, 재시도, 회복 과정이 보여야 합니다.",
        detail: "리뷰어는 실수를 감추기보다 디버깅 과정을 드러내 신뢰를 만드는 방향을 밀어붙입니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "briefing-room", tester: "briefing-room", reviewer: "briefing-room" },
          { planner: "planning", coder: "planning", tester: "planning", reviewer: "planning" }
        )
      });
      await io.wait(320);

      io.emitRun({
        type: EVENT_TYPES.RUN_STARTED,
        agentId: "planner",
        roomId: "briefing-room",
        stageId: "planning",
        status: "planning",
        attempt: 1,
        summary: "기획자가 작업을 수락하고 실행 루프를 열었습니다",
        detail: "범위, 완료 기준, 협업 규칙이 정리되었습니다."
      });
      await io.wait(200);

      io.emitStage({
        type: EVENT_TYPES.STAGE_STARTED,
        agentId: "planner",
        roomId: "briefing-room",
        stageId: "planning",
        status: "planning",
        attempt: 1,
        summary: "기획자가 실행 단계와 완료 기준을 정리했습니다",
        detail: "공용 스키마, 오케스트레이션 루프, 실시간 스트리밍, 팀형 UI, 재시도 노출 계획을 세웁니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "briefing-room", tester: "briefing-room", reviewer: "briefing-room" },
          { planner: "planning", coder: "planning", tester: "planning", reviewer: "planning" }
        )
      });
      await io.wait(640);

      io.emitDiscussion({
        type: EVENT_TYPES.HANDOFF_COMPLETED,
        agentId: "planner",
        roomId: "build-bay",
        stageId: "coding",
        status: "coding",
        attempt: 1,
        summary: "명확한 이벤트 계약과 연출 방향을 개발자에게 인계합니다.",
        detail: "개발자가 해석을 다시 하지 않아도 되도록 작업 경계를 묶어서 넘깁니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "planning", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(120);

      io.emitStage({
        type: EVENT_TYPES.STAGE_COMPLETED,
        agentId: "planner",
        roomId: "briefing-room",
        stageId: "planning",
        status: "planning",
        attempt: 1,
        summary: "기획이 승인되었고 개발 단계로 넘어갑니다",
        detail: "팀은 구체적인 계약과 분명한 UI 목표를 가지고 브리핑룸을 떠납니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "planning", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(120);

      io.emitAgent({
        type: EVENT_TYPES.AGENT_ASSIGNED,
        agentId: "coder",
        roomId: "build-bay",
        stageId: "coding",
        status: "coding",
        attempt: 1,
        summary: "개발자가 작업 소유권을 넘겨받았습니다",
        detail: "책임이 구현 단계로 이동합니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "planning", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(140);

      io.emitDiscussion({
        type: EVENT_TYPES.DISCUSSION_MESSAGE,
        agentId: "coder",
        roomId: "build-bay",
        stageId: "coding",
        status: "coding",
        attempt: 1,
        summary: "먼저 reducer와 방 이동 애니메이션을 이벤트 모델에 연결하겠습니다.",
        detail: "개발자는 움직임 레이어가 실제 오케스트레이션 상태를 반영하도록 데이터 정확도를 우선합니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "planning", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(160);

      io.emitDiscussion({
        type: EVENT_TYPES.DISCUSSION_MESSAGE,
        agentId: "tester",
        roomId: "qa-lab",
        stageId: "testing",
        status: "testing",
        attempt: 1,
        summary: "개발이 진행되는 동안 재생성 흐름 중심의 QA 체크리스트를 만들고 있습니다.",
        detail: "테스터는 구현이 끝날 때까지 기다리지 않고 병렬로 움직입니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "planning", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(140);

      io.emitDiscussion({
        type: EVENT_TYPES.DISCUSSION_MESSAGE,
        agentId: "reviewer",
        roomId: "review-desk",
        stageId: "review",
        status: "testing",
        attempt: 1,
        summary: "구현과 QA가 병렬로 진행되는 동안 화면의 이야기 흐름이 명확한지 보고 있습니다.",
        detail: "리뷰어는 맨 마지막까지 기다리지 않고 경험이 계속 해석 가능한지 지켜봅니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "planning", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(160);

      io.emitStage({
        type: EVENT_TYPES.STAGE_STARTED,
        agentId: "coder",
        roomId: "build-bay",
        stageId: "coding",
        status: "coding",
        attempt: 1,
        summary: "개발자가 실시간 이벤트 연결과 협업 보드 레이아웃을 구현했습니다",
        detail: "reducer, 방 상태, 에이전트 인계 렌더링이 연결되었습니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "planning", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(780);

      io.emitLog({
        type: EVENT_TYPES.LOG_APPENDED,
        agentId: "coder",
        roomId: "build-bay",
        stageId: "coding",
        status: "coding",
        attempt: 1,
        summary: "오피스 보드가 브리핑, 개발, QA, 장애 대응, 리뷰 위치를 추적합니다.",
        detail: "작업 이동은 타이머용 연출이 아니라 실제 방 전환 상태로 구동됩니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "planning", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(240);

      io.emitStage({
        type: EVENT_TYPES.STAGE_COMPLETED,
        agentId: "coder",
        roomId: "build-bay",
        stageId: "coding",
        status: "coding",
        attempt: 1,
        summary: "초기 구현이 검증 준비 상태가 되었습니다",
        detail: "첫 번째 빌드가 QA에 전달될 준비를 마쳤습니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "planning", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(200);

      io.emitDiscussion({
        type: EVENT_TYPES.HANDOFF_COMPLETED,
        agentId: "coder",
        roomId: "qa-lab",
        stageId: "testing",
        status: "testing",
        attempt: 1,
        summary: "재연결 위험 구간을 표시한 채 QA로 빌드를 넘깁니다.",
        detail: "개발자는 리플레이 경로가 가장 약한 지점이라고 표시합니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "waiting", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(220);

      io.emitAgent({
        type: EVENT_TYPES.AGENT_ASSIGNED,
        agentId: "tester",
        roomId: "qa-lab",
        stageId: "testing",
        status: "testing",
        attempt: 1,
        summary: "테스터가 개발 결과를 인계받았습니다",
        detail: "이제 라이브 실행의 소유권은 QA에 있습니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "waiting", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(180);

      io.emitDiscussion({
        type: EVENT_TYPES.DISCUSSION_MESSAGE,
        agentId: "tester",
        roomId: "qa-lab",
        stageId: "testing",
        status: "testing",
        attempt: 1,
        summary: "흐름을 통과시키기 전에 재연결과 리플레이 시나리오를 점검합니다.",
        detail: "테스터는 실시간 UX가 사용자를 속이기 쉬운 지점을 집중적으로 봅니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "waiting", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(260);

      io.emitStage({
        type: EVENT_TYPES.STAGE_STARTED,
        agentId: "tester",
        roomId: "qa-lab",
        stageId: "testing",
        status: "testing",
        attempt: 1,
        summary: "테스터가 이벤트 스트림 통합 검사를 시작했습니다",
        detail: "스트림, reducer, 방 전환이 함께 검증됩니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "build-bay", tester: "qa-lab", reviewer: "review-desk" },
          { planner: "waiting", coder: "coding", tester: "testing", reviewer: "testing" }
        )
      });
      await io.wait(820);

      io.emitStage({
        type: EVENT_TYPES.STAGE_FAILED,
        agentId: "tester",
        roomId: "incident-desk",
        stageId: "testing",
        status: "failed",
        attempt: 1,
        summary: "짧은 끊김 뒤 재연결 과정에서 버퍼된 이벤트 하나를 놓쳤습니다",
        detail: "UI는 스트림을 복구했지만 리플레이 구간의 상태 전환 하나를 건너뛰었습니다.",
        extraPayload: {
          ...io.teamState(
            { planner: "briefing-room", coder: "incident-desk", tester: "incident-desk", reviewer: "review-desk" },
            { planner: "waiting", coder: "retrying", tester: "failed", reviewer: "testing" }
          ),
          nextStageId: "coding",
          errorCode: "STREAM_GAP"
        }
      });
      await io.wait(220);

      io.emitDiscussion({
        type: EVENT_TYPES.ANALYSIS_RECORDED,
        agentId: "tester",
        roomId: "incident-desk",
        stageId: "failed",
        status: "failed",
        attempt: 1,
        summary: "근본 원인은 렌더링이 아니라 리플레이 순서로 보입니다.",
        detail: "테스터는 문제가 애니메이션 레이어가 아니라 이벤트 버퍼링에 있음을 분리해냅니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "incident-desk", tester: "incident-desk", reviewer: "review-desk" },
          { planner: "waiting", coder: "retrying", tester: "failed", reviewer: "testing" }
        )
      });
      await io.wait(280);

      io.emitDiscussion({
        type: EVENT_TYPES.DISCUSSION_MESSAGE,
        agentId: "coder",
        roomId: "incident-desk",
        stageId: "retrying",
        status: "retrying",
        attempt: 2,
        summary: "동의합니다. 라이브 업데이트를 재개하기 전에 리플레이 큐를 수정하겠습니다.",
        detail: "개발자는 장애 대응석에서 문제를 확인하고 재시도 접근을 설명합니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "incident-desk", tester: "incident-desk", reviewer: "review-desk" },
          { planner: "waiting", coder: "retrying", tester: "failed", reviewer: "testing" }
        )
      });
      await io.wait(240);

      io.emitAgent({
        type: EVENT_TYPES.AGENT_ASSIGNED,
        agentId: "coder",
        roomId: "incident-desk",
        stageId: "retrying",
        status: "retrying",
        attempt: 2,
        summary: "실패가 재시도 맥락과 함께 개발자에게 되돌아왔습니다",
        detail: "원인 분석이 붙은 상태로 소유권이 다시 구현 단계로 돌아갑니다.",
        extraPayload: io.teamState(
          { planner: "briefing-room", coder: "incident-desk", tester: "incident-desk", reviewer: "review-desk" },
          { planner: "waiting", coder: "retrying", tester: "failed", reviewer: "testing" }
        )
      });
      await io.wait(180);

      io.emitStage({
        type: EVENT_TYPES.STAGE_STARTED,
        agentId: "coder",
        roomId: "incident-desk",
        stageId: "retrying",
        status: "retrying",
        attempt: 2,
        summary: "개발자가 리플레이 로직을 패치하고 실패 경로를 다시 시도합니다",
        detail: "수정안은 라이브 피드를 다시 붙이기 전에 누락된 이벤트를 먼저 재생합니다."
      });
      await io.wait(780);

      io.emitLog({
        type: EVENT_TYPES.LOG_APPENDED,
        agentId: "coder",
        roomId: "build-bay",
        stageId: "coding",
        status: "coding",
        attempt: 2,
        summary: "리플레이 버퍼가 라이브 재개 전에 누락 이벤트를 다시 적용합니다",
        detail: "이 수정으로 시각화된 워크플로우의 인과 관계가 유지됩니다."
      });
      await io.wait(260);

      io.emitDiscussion({
        type: EVENT_TYPES.HANDOFF_COMPLETED,
        agentId: "coder",
        roomId: "qa-lab",
        stageId: "testing",
        status: "testing",
        attempt: 2,
        summary: "재시도 빌드를 안전장치와 함께 QA에 다시 넘깁니다.",
        detail: "개발자는 재연결 의미론에 집중한 검증을 요청합니다."
      });
      await io.wait(200);

      io.emitAgent({
        type: EVENT_TYPES.AGENT_ASSIGNED,
        agentId: "tester",
        roomId: "qa-lab",
        stageId: "testing",
        status: "testing",
        attempt: 2,
        summary: "테스터가 수정된 빌드를 받아 두 번째 검증을 시작합니다",
        detail: "QA가 다시 한 번 검증 사이클을 돌립니다."
      });
      await io.wait(180);

      io.emitDiscussion({
        type: EVENT_TYPES.DISCUSSION_MESSAGE,
        agentId: "tester",
        roomId: "qa-lab",
        stageId: "testing",
        status: "testing",
        attempt: 2,
        summary: "재연결 상황에서도 리플레이 순서가 유지됩니다. 회귀 검사를 계속합니다.",
        detail: "이전까지 실패하던 경로가 이제 상태 연속성을 보존합니다."
      });
      await io.wait(260);

      io.emitStage({
        type: EVENT_TYPES.STAGE_STARTED,
        agentId: "tester",
        roomId: "qa-lab",
        stageId: "testing",
        status: "testing",
        attempt: 2,
        summary: "테스터가 패치 후 실패 시나리오를 다시 실행했습니다",
        detail: "재연결과 애니메이션 연속성을 함께 관찰합니다."
      });
      await io.wait(820);

      io.emitStage({
        type: EVENT_TYPES.STAGE_COMPLETED,
        agentId: "tester",
        roomId: "qa-lab",
        stageId: "testing",
        status: "testing",
        attempt: 2,
        summary: "회귀 검사가 통과했습니다",
        detail: "재시도 수정은 새로운 불일치 없이 결함을 해결했습니다."
      });
      await io.wait(220);

      io.emitDiscussion({
        type: EVENT_TYPES.HANDOFF_COMPLETED,
        agentId: "tester",
        roomId: "review-desk",
        stageId: "review",
        status: "testing",
        attempt: 2,
        summary: "QA가 안정화된 실행 결과를 최종 리뷰로 넘깁니다.",
        detail: "이제 팀은 경험이 명확하고 믿을 만한지 확인합니다."
      });
      await io.wait(180);

      io.emitAgent({
        type: EVENT_TYPES.AGENT_ASSIGNED,
        agentId: "reviewer",
        roomId: "review-desk",
        stageId: "review",
        status: "testing",
        attempt: 2,
        summary: "리뷰어가 검증 완료 결과물을 전달받았습니다",
        detail: "최종 판단 단계가 리뷰 데스크로 이동합니다."
      });
      await io.wait(180);

      io.emitDiscussion({
        type: EVENT_TYPES.DISCUSSION_MESSAGE,
        agentId: "reviewer",
        roomId: "review-desk",
        stageId: "review",
        status: "testing",
        attempt: 2,
        summary: "이제 정말 팀이 일하는 장면처럼 읽힙니다. 기획, 충돌, 진단, 회복이 모두 보입니다.",
        detail: "리뷰어는 UI가 전달하는 서사의 신뢰성과 명확성을 평가합니다."
      });
      await io.wait(260);

      io.emitStage({
        type: EVENT_TYPES.STAGE_STARTED,
        agentId: "reviewer",
        roomId: "review-desk",
        stageId: "review",
        status: "testing",
        attempt: 2,
        summary: "리뷰어가 출력 품질과 이벤트 완전성을 확인했습니다",
        detail: "이 워크플로우는 단순한 머신 로그가 아니라 사회적 협업 과정으로 이해됩니다."
      });
      await io.wait(620);

      io.emitRun({
        type: EVENT_TYPES.RUN_COMPLETED,
        agentId: "reviewer",
        roomId: "review-desk",
        stageId: "success",
        status: "success",
        attempt: 2,
        summary: "한 번의 재시도 끝에 워크플로우가 성공적으로 완료되었습니다",
        detail: "최종 상태에는 결과물뿐 아니라 학습과 회복 과정도 반영되어 있습니다."
      });
    }
  };
}

export function createOpenAIResponsesExecutor(options = {}) {
  const model = options.model || process.env.AI_WORKFLOW_MODEL || "gpt-5.4";
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;

  return {
    id: "openai-responses",
    isAvailable() {
      return Boolean(apiKey);
    },
    async execute({ runId, title, eventBus, store }) {
      const io = createExecutionHelpers({ eventBus, store, runId, title });

      io.emitRun({
        type: EVENT_TYPES.RUN_CREATED,
        agentId: "planner",
        roomId: "briefing-room",
        stageId: "planning",
        status: "planning",
        attempt: 1,
        summary: "OpenAI 실행 엔진이 작업을 수락했습니다",
        detail: `${model} 모델로 Responses API 요청을 준비합니다.`
      });

      io.emitDiscussion({
        type: EVENT_TYPES.DISCUSSION_MESSAGE,
        agentId: "planner",
        roomId: "briefing-room",
        stageId: "planning",
        status: "planning",
        attempt: 1,
        summary: "오케스트레이션 프롬프트를 모델에 전송합니다.",
        detail: "이 실행기는 프론트 계약을 바꾸지 않고도 mock 루프를 실제 Codex형 오케스트레이션으로 교체할 수 있게 설계되었습니다."
      });

      if (!apiKey) {
        io.emitStage({
          type: EVENT_TYPES.STAGE_FAILED,
          agentId: "planner",
          roomId: "incident-desk",
          stageId: "planning",
          status: "failed",
          attempt: 1,
          summary: "OPENAI_API_KEY가 없습니다",
          detail: "OpenAI 실행기가 선택되었지만 인증 정보가 없어 요청을 보낼 수 없습니다."
        });
        return;
      }

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          input: `You are the planner for an AI coding workflow. Produce a concise execution plan for: ${title}`,
          text: {
            format: {
              type: "text"
            }
          }
        })
      });

      const body = await response.json();

      if (!response.ok) {
        io.emitStage({
          type: EVENT_TYPES.STAGE_FAILED,
          agentId: "planner",
          roomId: "incident-desk",
          stageId: "planning",
          status: "failed",
          attempt: 1,
          summary: "Responses API 요청이 실패했습니다",
          detail: body.error?.message || "Unknown API error",
          extraPayload: {
            responseStatus: response.status
          }
        });
        return;
      }

      const message = body.output
        ?.flatMap((item) => item.content || [])
        ?.find((part) => part.type === "output_text")
        ?.text;

      io.emitLog({
        type: EVENT_TYPES.LOG_APPENDED,
        agentId: "planner",
        roomId: "briefing-room",
        stageId: "planning",
        status: "planning",
        attempt: 1,
        summary: "Responses API에서 모델 출력을 받았습니다",
        detail: message || "output_text가 반환되지 않았습니다."
      });

      io.emitRun({
        type: EVENT_TYPES.RUN_COMPLETED,
        agentId: "reviewer",
        roomId: "review-desk",
        stageId: "success",
        status: "success",
        attempt: 1,
        summary: "OpenAI 실행기가 단일 기획 패스를 완료했습니다",
        detail: "이 어댑터는 mock 팀을 실제 모델 기반 루프로 교체하는 연결 지점입니다."
      });
    }
  };
}
