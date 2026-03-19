# Session Handoff

## Session Snapshot

- Goal: Agent Office를 집에서 이어서 개발할 수 있도록 현재 목적, 진행 상태, 실행 방법, 다음 작업 방향을 남긴다.
- Current status: 로컬 프로토타입은 동작 중이며, 오피스 씬/캐릭터/말풍선/Codex 미러/역할 회전 배정까지 반영된 상태다.
- Last updated: 2026-03-19
- Primary repos: `/home/muhyeon_shin/packages/ai-workflow-visualizer`
- Active branches: `main`
- Last touched files:
  - [README.md](/home/muhyeon_shin/packages/ai-workflow-visualizer/README.md)
  - [apps/server/src/codexMirror.js](/home/muhyeon_shin/packages/ai-workflow-visualizer/apps/server/src/codexMirror.js)
  - [apps/web/src/components/OfficeSceneCanvas.jsx](/home/muhyeon_shin/packages/ai-workflow-visualizer/apps/web/src/components/OfficeSceneCanvas.jsx)
  - [docs/worklogs/2026-03-19-agent-office-session-summary.md](/home/muhyeon_shin/packages/ai-workflow-visualizer/docs/worklogs/2026-03-19-agent-office-session-summary.md)
  - [docs/handoffs/2026-03-19-agent-office-next-session.md](/home/muhyeon_shin/packages/ai-workflow-visualizer/docs/handoffs/2026-03-19-agent-office-next-session.md)

## Next Actions

- [ ] `git status`로 README Windows setup 변경이 커밋됐는지 먼저 확인
- [ ] Windows 집 환경에서 `npm install`, `npm run start:server`, `npm run dev:web`로 실행 확인
- [ ] 다음 구현 목표를 `서버처럼 배포 가능한 구조 정리`로 둘지, `오피스 씬 연출 강화`로 둘지 결정

## Progress Checklist

- [x] Confirm starting context
- [x] Document current risks and planned edits
- [x] Implement first change set
- [x] Verify first change set
- [x] Implement remaining change set(s)
- [x] Verify final state
- [x] Refresh worklog summary

## Notes for Next Session

- 현재 프로젝트의 핵심 목적은 "AI 코딩 워크플로우를 팀 사무실 시뮬레이션처럼 보여주는 것"이다.
- 사용자는 카드형 대시보드보다 `카이로소프트풍 오피스 시뮬레이션`에 강하게 반응했다.
- 현재 Codex 미러는 단일 Codex 세션 로그를 읽어 팀처럼 보이게 해석하는 구조다.
- 사용자는 장기적으로 광고, 계정 기능, 사무실 확장, 서비스화까지 관심이 있지만, 현재 1차 목표는 `집 컴퓨터에서 서버처럼 띄워보는 것`이다.
- 이 프로젝트를 clone한 뒤 다음 Codex에게 아래 문서를 먼저 읽히면 맥락을 빠르게 잡을 수 있다:
  - [README.md](/home/muhyeon_shin/packages/ai-workflow-visualizer/README.md)
  - [docs/worklogs/2026-03-19-agent-office-session-summary.md](/home/muhyeon_shin/packages/ai-workflow-visualizer/docs/worklogs/2026-03-19-agent-office-session-summary.md)
  - [docs/handoffs/2026-03-19-agent-office-next-session.md](/home/muhyeon_shin/packages/ai-workflow-visualizer/docs/handoffs/2026-03-19-agent-office-next-session.md)

## Verification Status

- Commands run:
  - `node --check /home/muhyeon_shin/packages/ai-workflow-visualizer/apps/server/src/codexMirror.js`
  - `npm run build:web`
  - `curl -s http://127.0.0.1:8787/health`
  - `curl -s -X POST http://127.0.0.1:8787/api/mirrors/codex/latest`
  - `curl -s http://127.0.0.1:8787/api/runs/current`
- Results:
  - 서버 정상 구동 확인
  - 웹 빌드 성공
  - Codex 세션 attach 성공
  - 개발자 역할/방 배치가 고정이 아니라 회전하는 것 확인
- Pending verification:
  - Windows 집 환경에서 실제 실행 확인
  - Windows 환경에서 Codex 로그 미러가 그대로 동작하는지 확인
  - README Windows setup 추가분 커밋/푸시 확인
