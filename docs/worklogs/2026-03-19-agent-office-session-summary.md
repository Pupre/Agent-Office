# 작업 로그

- 날짜: 2026-03-19
- 작업: Agent Office 프로토타입 구체화 및 다음 세션 인수인계 문서화
- 범위: 실시간 오케스트레이션 시각화, Codex 미러링, 오피스 씬 연출, 로컬 실행 문서화
- 저장소: `/home/muhyeon_shin/packages/ai-workflow-visualizer`
- 활성 브랜치: `main`

## 작업 배경

사용자는 AI 코딩 워크플로우를 단순 로그가 아니라 "작은 팀이 사무실에서 일하는 장면"처럼 보여주는 웹앱을 원했다. 초기 요구는 React 기반 대시보드였지만, 대화가 진행되면서 방향은 더 명확해졌다. 사용자가 실제로 원한 것은 카드형 대시보드가 아니라 `카이로소프트풍 오피스 시뮬레이션`에 가까운 시각화였다.

이 프로젝트는 이후 실제 서비스로 확장할 가능성도 고려하고 있다. 사용자가 집에서 이 저장소를 clone한 뒤, 다른 Codex 세션에서도 문서만 읽고 바로 이어서 작업할 수 있도록 현재 맥락과 향후 방향을 남겨둘 필요가 생겼다.

## 변경 전 상태

초기 형태는 이벤트 기반 대시보드에 가까웠다.

- 에이전트 카드 UI
- 타임라인 패널
- 상태 뱃지
- run 목록과 로그 패널

이 상태도 흐름 확인에는 유용했지만, 사용자가 원한 "직원들이 실제로 움직이며 일하는 느낌"은 약했다. 또 Codex 세션 미러가 붙은 뒤에는 시각화가 지나치게 정적이거나, 같은 개발자가 계속 같은 역할을 반복하는 문제가 있었다.

## 문제점 또는 리스크

초기/중간 단계에서 드러난 핵심 문제는 다음과 같았다.

- 화면이 여전히 대시보드처럼 보여 몰입감이 약했다.
- 캐릭터가 한 명씩만 움직이거나, 동시 작업처럼 보이지 않는 시점이 있었다.
- 개발자 3명이 있어도 역할 배치가 고정되어 현실감이 떨어졌다.
- 말풍선이 겹치거나, 작업 대화가 없어 "일하는 장면" 느낌이 약했다.
- README가 현재 구조를 충분히 설명하지 못해 집에서 이어받기 어려웠다.
- 현재 구조는 로컬 프로토타입이며, 아직 멀티유저 서비스 구조는 아니다.

## 변경 전략

방향은 "대시보드 개선"이 아니라 "오피스 시뮬레이션 강화"로 잡았다.

핵심 전략:

- UI 중심이 아니라 `event -> office scene` 렌더링 파이프라인을 강화한다.
- Codex 세션은 진짜 멀티에이전트가 아니므로, 관측 가능한 로그를 역할별 팀 행동으로 재해석한다.
- 개발자 3명을 고정 캐릭터가 아니라 `문맥에 따라 회의/구현/검증/장애대응`을 돌아가며 맡는 직원 풀처럼 만든다.
- 집에서 바로 실행할 수 있도록 README와 handoff를 정리한다.

## 구현 메모

- 변경한 파일: [README.md](/home/muhyeon_shin/packages/ai-workflow-visualizer/README.md)
- 무엇을 바꿨는지:
  - 프로젝트 설명을 현재 상태에 맞게 전면 갱신했다.
  - Node/npm/Python 버전과 로컬 실행 절차를 추가했다.
  - Windows PowerShell 기준 설치/실행 절차를 추가했다.
  - 현재 제공 API와 Codex live mirror의 한계를 적었다.
- 왜 바꿨는지:
  - 사용자가 집에서 clone 후 바로 실행하고 싶어했고, 다음 세션 Codex도 README만 읽고 큰 흐름을 파악할 수 있어야 했다.
- 영향:
  - 온보딩이 쉬워졌다.
  - 집/윈도우 환경에서 실행 준비를 덜 헤매게 된다.

- 변경한 파일: [apps/server/src/codexMirror.js](/home/muhyeon_shin/packages/ai-workflow-visualizer/apps/server/src/codexMirror.js)
- 무엇을 바꿨는지:
  - `assignmentCursor` 기반의 회전 배정 로직을 넣었다.
  - `getNextCoder`, `getCoderSquad`를 도입했다.
  - planning, work, read, incident, review, build 상태가 고정 조합이 아니라 문맥에 따라 달라지게 바꿨다.
  - tool action 해석 시 어떤 개발자가 회의에 끼는지, 누가 QA 랩에 붙는지, 누가 incident desk로 가는지를 순환시키도록 바꿨다.
- 왜 바꿨는지:
  - 이전에는 같은 개발자가 계속 브리핑룸, 나머지 둘은 계속 구현만 맡아 사용자가 단조롭게 느꼈다.
- 영향:
  - 같은 작업 종류라도 개발자들의 동선과 역할 분담이 달라진다.
  - 오피스 씬이 더 "팀이 돌아가는 장면"처럼 보인다.

- 변경한 파일: [apps/web/src/components/OfficeSceneCanvas.jsx](/home/muhyeon_shin/packages/ai-workflow-visualizer/apps/web/src/components/OfficeSceneCanvas.jsx)
- 무엇을 바꿨는지:
  - 개발자가 build-bay에서 코딩할 때 앉아 일하는 렌더를 넣었다.
  - 최근 `discussion` 이벤트를 말풍선으로 그리게 했다.
  - 말풍선 충돌 회피 로직을 추가했다.
- 왜 바꿨는지:
  - 아이콘이 떠다니는 느낌에서 벗어나 오피스 노동 장면처럼 보여야 했다.
- 영향:
  - 개발 구역이 더 사무실처럼 보인다.
  - 말풍선이 실제 작업 대화처럼 보인다.

## 기대 효과

- 사용자가 원하는 `AI 직원팀이 사무실에서 일하는 장면`에 더 가까워진다.
- Codex 세션 미러가 단일 주체 로그라도, 화면에서는 팀 협업처럼 보일 수 있다.
- README와 handoff 문서 덕분에 다른 환경에서 이어받기 쉬워진다.

## 검증

실행/확인한 내용:

- `node --check /home/muhyeon_shin/packages/ai-workflow-visualizer/apps/server/src/codexMirror.js`
- `npm run build:web`
- `curl -s http://127.0.0.1:8787/health`
- `curl -s -X POST http://127.0.0.1:8787/api/mirrors/codex/latest`
- `curl -s http://127.0.0.1:8787/api/runs/current`

확인 결과:

- `codexMirror.js` 문법 정상
- 웹 빌드 정상
- 서버 헬스 체크 정상
- Codex 최신 세션 attach 정상
- 현재 run 데이터에서 개발자 배정이 고정되지 않고 회전하는 것 확인

추가 메모:

- GitHub push는 이 환경에서 DNS 문제로 실패했다.
- 현재 `README.md`의 Windows setup 추가는 아직 커밋되지 않은 상태일 수 있으므로 다음 세션에서 status 확인이 필요하다.

## 남은 리스크

- Codex live mirror는 어디까지나 해석 기반이다. 진짜 멀티에이전트 오케스트레이션은 아니다.
- 현재는 인메모리 상태 저장이므로 서비스화하려면 DB와 사용자 분리가 필요하다.
- 말풍선 내용은 아직 템플릿 기반이 강해서, 더 자연스러운 대화 분화가 가능하다.
- 집의 Windows 환경에서는 Codex 로그 경로와 미러링 방식이 다를 수 있으므로 확인이 필요하다.
- 광고/계정/과금/멀티유저는 아직 제품 아이디어 수준이며 구현은 시작하지 않았다.
