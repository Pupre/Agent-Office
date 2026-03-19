import http from "node:http";
import { createEventBus } from "./eventBus.js";
import { createCodexMirror } from "./codexMirror.js";
import { createOrchestrator, createWorkflowStore } from "./orchestrator.js";
import { createRouter } from "./router.js";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";
const eventBus = createEventBus();
const store = createWorkflowStore();
const orchestrator = createOrchestrator(eventBus, store);
const codexMirror = createCodexMirror({
  eventBus,
  store,
  codexHome: process.env.CODEX_HOME || "/home/muhyeon_shin/.codex"
});
const route = createRouter(orchestrator, codexMirror);
const clients = new Set();

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(body));
}

function broadcastEvent(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

eventBus.subscribe((event) => {
  broadcastEvent(event);
});

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { error: "Missing URL" });
    return;
  }

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  if (await route(req, res, readBody, sendJson)) {
    return;
  }

  if (req.url === "/api/events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });

    res.write(`event: ready\ndata: ${JSON.stringify({ connected: true })}\n\n`);
    clients.add(res);

    res.on("close", () => {
      clients.delete(res);
    });
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`AI workflow server listening on http://${HOST}:${PORT}`);
});
