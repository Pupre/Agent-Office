import fs from "node:fs";
import path from "node:path";
import {
  AGENT_BY_ID,
  EVENT_TYPES,
  ROOM_BY_ID,
  createWorkflowEvent
} from "@ai-workflow/shared";

function shortText(value, max = 96) {
  if (!value) {
    return "";
  }

  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function createTeamState(activeAgentIds, assignments, statuses) {
  return {
    activeAgentIds,
    assignments,
    statuses
  };
}

function getPlanningTeamState() {
  return createTeamState(
    ["planner", "coder", "tester", "reviewer"],
    {
      planner: "briefing-room",
      coder: "briefing-room",
      tester: "briefing-room",
      reviewer: "briefing-room"
    },
    {
      planner: "planning",
      coder: "planning",
      tester: "planning",
      reviewer: "planning"
    }
  );
}

function getWorkTeamState(primaryStage = "coding") {
  return createTeamState(
    ["coder", "tester", "reviewer"],
    {
      planner: "briefing-room",
      coder: "build-bay",
      tester: "qa-lab",
      reviewer: "review-desk"
    },
    {
      planner: "planning",
      coder: primaryStage === "testing" ? "coding" : primaryStage,
      tester: "testing",
      reviewer: "testing"
    }
  );
}

function getReadTeamState() {
  return createTeamState(
    ["planner", "coder"],
    {
      planner: "briefing-room",
      coder: "build-bay",
      tester: "qa-lab",
      reviewer: "review-desk"
    },
    {
      planner: "planning",
      coder: "coding",
      tester: "waiting",
      reviewer: "waiting"
    }
  );
}

function getIncidentTeamState() {
  return createTeamState(
    ["coder", "tester", "reviewer"],
    {
      planner: "briefing-room",
      coder: "incident-desk",
      tester: "incident-desk",
      reviewer: "review-desk"
    },
    {
      planner: "planning",
      coder: "retrying",
      tester: "failed",
      reviewer: "testing"
    }
  );
}

function getReviewTeamState() {
  return createTeamState(
    ["reviewer", "tester"],
    {
      planner: "briefing-room",
      coder: "build-bay",
      tester: "qa-lab",
      reviewer: "review-desk"
    },
    {
      planner: "planning",
      coder: "coding",
      tester: "testing",
      reviewer: "success"
    }
  );
}

function detectToolAction(toolName, payload) {
  if (toolName.includes("apply_patch")) {
    return {
      agentId: "coder",
      roomId: "build-bay",
      stageId: "coding",
      status: "coding",
      summary: "개발자가 코드 패치를 적용하고 있습니다.",
      detail: "apply_patch를 통해 직접 파일 수정을 진행합니다."
    };
  }

  if (toolName.includes("playwright") || toolName.includes("browser_")) {
    return {
      agentId: "tester",
      roomId: "qa-lab",
      stageId: "testing",
      status: "testing",
      summary: "테스터가 브라우저 화면을 확인하고 있습니다.",
      detail: shortText(JSON.stringify(payload), 180)
    };
  }

  if (toolName.includes("search_openai_docs") || toolName.includes("fetch_openai_doc")) {
    return {
      agentId: "planner",
      roomId: "briefing-room",
      stageId: "planning",
      status: "planning",
      summary: "기획자가 공식 문서를 확인하고 있습니다.",
      detail: shortText(JSON.stringify(payload), 180)
    };
  }

  if (toolName.includes("exec_command")) {
    const cmd = typeof payload?.cmd === "string" ? payload.cmd : "";
    const isRead =
      cmd.startsWith("sed ") ||
      cmd.startsWith("cat ") ||
      cmd.startsWith("rg ") ||
      cmd.startsWith("find ") ||
      cmd.startsWith("ls ") ||
      cmd.startsWith("tree ");
    const isEdit =
      cmd.includes("apply_patch") ||
      cmd.startsWith("mv ") ||
      cmd.startsWith("cp ");
    const isTest =
      cmd.includes("build") ||
      cmd.includes("test") ||
      cmd.includes("pytest") ||
      cmd.includes("curl") ||
      cmd.includes("node --check");
    const isInfra =
      cmd.includes("lsof") ||
      cmd.includes("ps -ef") ||
      cmd.includes("kill ") ||
      cmd.includes("start:server") ||
      cmd.includes("ss -ltnp");

    if (isRead) {
      return {
        agentId: "planner",
        roomId: "briefing-room",
        stageId: "planning",
        status: "planning",
        summary: `구조 파악 중: ${shortText(cmd, 64)}`,
        detail: cmd,
        teamState: getReadTeamState()
      };
    }

    if (isEdit) {
      return {
        agentId: "coder",
        roomId: "build-bay",
        stageId: "coding",
        status: "coding",
        summary: `코드 수정 중: ${shortText(cmd, 64)}`,
        detail: cmd,
        teamState: getWorkTeamState("coding")
      };
    }

    return {
      agentId: isTest ? "tester" : "coder",
      roomId: isTest ? "qa-lab" : isInfra ? "incident-desk" : "build-bay",
      stageId: isTest ? "testing" : isInfra ? "retrying" : "coding",
      status: isTest ? "testing" : isInfra ? "retrying" : "coding",
      summary: `${isTest ? "검증" : isInfra ? "환경 정비" : "개발"} 명령 실행: ${shortText(cmd, 64)}`,
      detail: cmd,
      teamState: isTest
        ? getWorkTeamState("testing")
        : isInfra
          ? getIncidentTeamState()
          : getWorkTeamState("coding")
    };
  }

  return {
    agentId: "reviewer",
    roomId: "review-desk",
    stageId: "review",
    status: "testing",
    summary: `도구 호출 감지: ${toolName}`,
    detail: shortText(JSON.stringify(payload), 180),
    teamState: getReviewTeamState()
  };
}

function createPublisher({ eventBus, store, runId, title }) {
  const sequenceRef = { value: 1 };

  return {
    emit({
      kind,
      type,
      agentId,
      roomId,
      stageId,
      status,
      attempt = 1,
      summary,
      detail,
      timestamp,
      teamState
    }) {
      const event = createWorkflowEvent({
        runId,
        sequence: sequenceRef.value++,
        kind,
        type,
        task: {
          id: "task_codex_live",
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
          teamState
        }
      });

      if (timestamp) {
        event.timestamp = timestamp;
      }

      store.update(event);
      eventBus.publish(event);
      return event;
    }
  };
}

function parseTimestamp(line) {
  const match = line.match(/^(\d{4}-\d{2}-\d{2}T[^ ]+)/);
  return match ? match[1] : new Date().toISOString();
}

export function createCodexMirror({ eventBus, store, codexHome }) {
  const historyPath = path.join(codexHome, "history.jsonl");
  const logPath = path.join(codexHome, "log", "codex-tui.log");
  const mirrors = new Map();
  let attachedSessionId = null;

  function getLatestSessionId() {
    if (fs.existsSync(logPath)) {
      const recentLogLines = fs
        .readFileSync(logPath, "utf8")
        .split("\n")
        .filter(Boolean)
        .slice(-400);

      for (let index = recentLogLines.length - 1; index >= 0; index -= 1) {
        const line = recentLogLines[index];
        const match =
          line.match(/thread.id=([0-9a-f-]+)/) ??
          line.match(/thread_id=([0-9a-f-]+)/);

        if (match?.[1]) {
          return match[1];
        }
      }
    }

    if (!fs.existsSync(historyPath)) {
      return null;
    }

    const lines = fs.readFileSync(historyPath, "utf8").trim().split("\n").filter(Boolean);
    const last = lines.at(-1);
    const record = parseJsonSafe(last);
    return record?.session_id ?? null;
  }

  function listSessions() {
    const sessionMap = new Map();

    if (fs.existsSync(historyPath)) {
      const lines = fs.readFileSync(historyPath, "utf8").split("\n").filter(Boolean);
      for (const line of lines) {
        const entry = parseJsonSafe(line);
        if (!entry?.session_id) {
          continue;
        }

        const timestamp = entry.ts ? new Date(entry.ts * 1000).toISOString() : null;
        const current = sessionMap.get(entry.session_id);
        sessionMap.set(entry.session_id, {
          sessionId: entry.session_id,
          runId: `codex_${entry.session_id.slice(0, 8)}`,
          title: `실시간 Codex 세션 ${entry.session_id.slice(0, 8)}`,
          lastPrompt: entry.text ?? current?.lastPrompt ?? "",
          updatedAt: timestamp ?? current?.updatedAt ?? null
        });
      }
    }

    if (fs.existsSync(logPath)) {
      const lines = fs.readFileSync(logPath, "utf8").split("\n").filter(Boolean).slice(-800);
      for (const line of lines) {
        const match =
          line.match(/thread.id=([0-9a-f-]+)/) ??
          line.match(/thread_id=([0-9a-f-]+)/);
        if (!match?.[1]) {
          continue;
        }

        const sessionId = match[1];
        const current = sessionMap.get(sessionId);
        sessionMap.set(sessionId, {
          sessionId,
          runId: `codex_${sessionId.slice(0, 8)}`,
          title: `실시간 Codex 세션 ${sessionId.slice(0, 8)}`,
          lastPrompt: current?.lastPrompt ?? "",
          updatedAt: parseTimestamp(line) ?? current?.updatedAt ?? null
        });
      }
    }

    return [...sessionMap.values()]
      .sort((left, right) => {
        const leftTime = left.updatedAt ? Date.parse(left.updatedAt) : 0;
        const rightTime = right.updatedAt ? Date.parse(right.updatedAt) : 0;
        return rightTime - leftTime;
      })
      .slice(0, 12);
  }

  function ensureMirror(sessionId) {
    const runId = `codex_${sessionId.slice(0, 8)}`;
    const title = `실시간 Codex 세션 ${sessionId.slice(0, 8)}`;

    if (mirrors.has(sessionId)) {
      return mirrors.get(sessionId);
    }

    store.createRun(runId, title);
    const publisher = createPublisher({ eventBus, store, runId, title });

    const mirror = {
      sessionId,
      runId,
      title,
      publisher,
      teamState: getPlanningTeamState(),
      seenHistoryKeys: new Set(),
      seenLogKeys: new Set(),
      seenTurnIds: new Set(),
      watcher: null,
      interval: null
    };

    mirrors.set(sessionId, mirror);
    return mirror;
  }

  function ingestHistory(mirror) {
    if (!fs.existsSync(historyPath)) {
      return;
    }

    const lines = fs.readFileSync(historyPath, "utf8").split("\n").filter(Boolean);
    const entries = lines
      .map((line) => parseJsonSafe(line))
      .filter((entry) => entry?.session_id === mirror.sessionId)
      .slice(-30);

    for (const entry of entries) {
      const key = `${entry.ts}:${entry.text}`;
      if (mirror.seenHistoryKeys.has(key)) {
        continue;
      }

      mirror.seenHistoryKeys.add(key);
      const timestamp = new Date(entry.ts * 1000).toISOString();
      const isFirstPrompt = mirror.seenHistoryKeys.size === 1;

      mirror.publisher.emit({
        kind: isFirstPrompt ? "run" : "discussion",
        type: isFirstPrompt ? EVENT_TYPES.RUN_CREATED : EVENT_TYPES.DISCUSSION_MESSAGE,
        agentId: "planner",
        roomId: "briefing-room",
        stageId: "planning",
        status: "planning",
        summary: isFirstPrompt
          ? "현재 Codex 세션을 오피스 화면에 연결했습니다."
          : `사용자 프롬프트 수신: ${shortText(entry.text, 72)}`,
        detail: entry.text,
        timestamp,
        teamState: getPlanningTeamState()
      });
    }
  }

  function ingestLogs(mirror) {
    if (!fs.existsSync(logPath)) {
      return;
    }

    const lines = fs
      .readFileSync(logPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .slice(-400);

    for (const line of lines) {
      if (!line.includes(mirror.sessionId)) {
        continue;
      }

      if (mirror.seenLogKeys.has(line)) {
        continue;
      }

      mirror.seenLogKeys.add(line);
      const timestamp = parseTimestamp(line);

      const turnMatch = line.match(/turn.id=([0-9a-f-]+)/);
      const turnId = turnMatch?.[1] ?? null;

      if (
        line.includes("submission_dispatch") &&
        line.includes('codex.op="user_turn"') &&
        line.includes("tasks: new")
      ) {
        if (turnId && mirror.seenTurnIds.has(turnId)) {
          continue;
        }

        if (turnId) {
          mirror.seenTurnIds.add(turnId);
        }

        mirror.publisher.emit({
          kind: "run",
          type: EVENT_TYPES.RUN_STARTED,
          agentId: "planner",
          roomId: "briefing-room",
          stageId: "planning",
          status: "planning",
          summary: "Codex가 새 턴을 받아 작업 계획을 세우기 시작했습니다.",
          detail: "현재 대화 세션의 사용자 턴이 실행 루프로 들어왔습니다.",
          timestamp,
          teamState: getPlanningTeamState()
        });

        mirror.publisher.emit({
          kind: "discussion",
          type: EVENT_TYPES.DISCUSSION_MESSAGE,
          agentId: "planner",
          roomId: "briefing-room",
          stageId: "planning",
          status: "planning",
          summary: "요구사항을 정리하고 작업 순서를 나누고 있습니다.",
          detail: "파일 탐색, 수정, 검증 순서를 정하고 필요한 역할을 배치합니다.",
          timestamp,
          teamState: getPlanningTeamState()
        });
        continue;
      }

      if (line.includes("tasks: close")) {
        mirror.publisher.emit({
          kind: "stage",
          type: EVENT_TYPES.STAGE_COMPLETED,
          agentId: "tester",
          roomId: "qa-lab",
          stageId: "testing",
          status: "testing",
          summary: "현재 턴의 작업 실행과 검증이 마무리되었습니다.",
          detail: "이번 사용자 요청에 대한 작업 단계가 종료되었습니다.",
          timestamp,
          teamState: getReviewTeamState()
        });

        mirror.publisher.emit({
          kind: "discussion",
          type: EVENT_TYPES.HANDOFF_COMPLETED,
          agentId: "reviewer",
          roomId: "review-desk",
          stageId: "review",
          status: "testing",
          summary: "리뷰어가 이번 턴 결과를 정리하고 있습니다.",
          detail: "작업 로그와 수정 내용을 바탕으로 응답을 마무리하는 단계입니다.",
          timestamp,
          teamState: getReviewTeamState()
        });

        mirror.publisher.emit({
          kind: "run",
          type: EVENT_TYPES.RUN_COMPLETED,
          agentId: "reviewer",
          roomId: "review-desk",
          stageId: "success",
          status: "success",
          summary: "현재 사용자 요청에 대한 턴이 종료되었습니다.",
          detail: "다음 프롬프트가 들어오기 전까지 이번 작업은 완료 상태로 유지됩니다.",
          timestamp,
          teamState: getReviewTeamState()
        });
        continue;
      }

      const toolCallMatch = line.match(/ToolCall: ([^ ]+) (\{.*\})/);
      if (toolCallMatch) {
        const [, toolName, rawPayload] = toolCallMatch;
        const payload = parseJsonSafe(rawPayload);
        const action = detectToolAction(toolName, payload);

        mirror.publisher.emit({
          kind: "log",
          type: EVENT_TYPES.LOG_APPENDED,
          agentId: action.agentId,
          roomId: action.roomId,
          stageId: action.stageId,
          status: action.status,
          summary: action.summary,
          detail: action.detail,
          timestamp,
          teamState: action.teamState ??
            (action.stageId === "planning"
              ? getPlanningTeamState()
              : getWorkTeamState(action.stageId === "testing" ? "testing" : "coding"))
        });
        continue;
      }

      if (
        line.includes(" ERROR ") ||
        (line.includes(" WARN ") && !line.includes("unknown feature key in config: rmcp_client"))
      ) {
        mirror.publisher.emit({
          kind: "stage",
          type: EVENT_TYPES.ANALYSIS_RECORDED,
          agentId: "tester",
          roomId: "incident-desk",
          stageId: "failed",
          status: "failed",
          summary: "Codex 세션에서 경고 또는 오류가 감지되었습니다.",
          detail: shortText(line, 220),
          timestamp,
          teamState: getIncidentTeamState()
        });
      }
    }
  }

  function startSessionMirror(sessionId) {
    if (!sessionId) {
      return null;
    }

    attachedSessionId = sessionId;
    const mirror = ensureMirror(sessionId);
    ingestHistory(mirror);
    ingestLogs(mirror);

    if (!mirror.interval) {
      mirror.interval = setInterval(() => {
        ingestHistory(mirror);
        ingestLogs(mirror);
      }, 1200);
    }

    return {
      sessionId: mirror.sessionId,
      runId: mirror.runId,
      title: mirror.title
    };
  }

  function getMirrorState() {
    const sessionId = attachedSessionId ?? getLatestSessionId();
    if (!sessionId) {
      return null;
    }

    const mirror = mirrors.get(sessionId);
    return {
      sessionId,
      runId: mirror?.runId ?? `codex_${sessionId.slice(0, 8)}`,
      attached: Boolean(mirror),
      attachedSessionId
    };
  }

  return {
    getLatestSessionId,
    listSessions,
    getMirrorState,
    startSessionMirror,
    startLatestSessionMirror() {
      return startSessionMirror(getLatestSessionId());
    }
  };
}
