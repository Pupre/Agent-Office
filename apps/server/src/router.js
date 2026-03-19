export function createRouter(orchestrator, codexMirror) {
  return async function route(req, res, readBody, sendJson) {
    if (!req.url) {
      sendJson(res, 400, { error: "Missing URL" });
      return true;
    }

    const requestUrl = new URL(req.url, "http://localhost");
    const { pathname } = requestUrl;

    if (pathname === "/health") {
      sendJson(res, 200, { ok: true });
      return true;
    }

    if (pathname === "/api/schema") {
      sendJson(res, 200, {
        statuses: orchestrator.getStatusCatalog(),
        executor: orchestrator.getExecutorMeta(),
        codexMirror: codexMirror?.getMirrorState?.() ?? null
      });
      return true;
    }

    if (pathname === "/api/mirrors/codex/latest" && req.method === "GET") {
      sendJson(res, 200, {
        mirror: codexMirror?.getMirrorState?.() ?? null
      });
      return true;
    }

    if (pathname === "/api/mirrors/codex/sessions" && req.method === "GET") {
      sendJson(res, 200, {
        sessions: codexMirror?.listSessions?.() ?? []
      });
      return true;
    }

    if (pathname === "/api/mirrors/codex/latest" && req.method === "POST") {
      sendJson(res, 202, {
        mirror: codexMirror?.startLatestSessionMirror?.() ?? null
      });
      return true;
    }

    if (pathname === "/api/mirrors/codex/attach" && req.method === "POST") {
      const body = await readBody(req).catch(() => ({}));
      sendJson(res, 202, {
        mirror: codexMirror?.startSessionMirror?.(body.sessionId) ?? null
      });
      return true;
    }

    if (pathname === "/api/runs" && req.method === "GET") {
      sendJson(res, 200, {
        runs: orchestrator.listRuns()
      });
      return true;
    }

    if (pathname === "/api/runs/current" && req.method === "GET") {
      sendJson(res, 200, {
        run: orchestrator.getLatestRun()
      });
      return true;
    }

    if (pathname.startsWith("/api/runs/") && req.method === "GET") {
      const runId = pathname.replace("/api/runs/", "");
      sendJson(res, 200, {
        run: orchestrator.getRun(runId)
      });
      return true;
    }

    if (pathname === "/api/runs" && req.method === "POST") {
      const body = await readBody(req).catch(() => ({}));
      const result = await orchestrator.startRun(body);
      sendJson(res, 202, result);
      return true;
    }

    return false;
  };
}
