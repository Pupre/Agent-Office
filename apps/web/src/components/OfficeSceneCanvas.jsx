import { useEffect, useRef } from "react";

const AGENT_VISUALS = {
  planner: { color: "#66e0c2", accent: "#c7fff1", label: "기", prop: "board" },
  coder: { color: "#5cb8ff", accent: "#d7f0ff", label: "개", prop: "laptop" },
  tester: { color: "#ffca72", accent: "#fff0cc", label: "테", prop: "bug" },
  reviewer: { color: "#95ea8d", accent: "#efffe6", label: "검", prop: "stamp" }
};

const ROOM_LAYOUT = {
  "briefing-room": {
    x: 70,
    y: 54,
    w: 282,
    h: 214,
    center: [211, 162],
    slots: [[122, 156], [194, 156], [122, 214], [194, 214]]
  },
  "build-bay": {
    x: 392,
    y: 54,
    w: 454,
    h: 214,
    center: [618, 162],
    slots: [[486, 140], [586, 140], [690, 140], [586, 208]]
  },
  "qa-lab": {
    x: 70,
    y: 318,
    w: 276,
    h: 186,
    center: [208, 410],
    slots: [[126, 392], [202, 392], [126, 448], [202, 448]]
  },
  "incident-desk": {
    x: 392,
    y: 318,
    w: 244,
    h: 186,
    center: [514, 410],
    slots: [[448, 392], [524, 392], [448, 448], [524, 448]]
  },
  "review-desk": {
    x: 672,
    y: 318,
    w: 174,
    h: 186,
    center: [759, 410],
    slots: [[716, 392], [788, 392], [716, 448], [788, 448]]
  }
};

const HOME_LAYOUT = {
  planner: [126, 586],
  coder: [308, 586],
  tester: [522, 586],
  reviewer: [740, 586]
};

const ROOM_ACTION_SPOTS = {
  "briefing-room": [[122, 156], [210, 156], [154, 214], [234, 214]],
  "build-bay": [[486, 140], [560, 178], [690, 140], [620, 206]],
  "qa-lab": [[126, 392], [202, 392], [150, 448], [226, 448]],
  "incident-desk": [[448, 392], [524, 392], [476, 448], [540, 448]],
  "review-desk": [[716, 392], [788, 392], [742, 448], [804, 448]]
};

const EFFECT_BY_STATUS = {
  planning: { glyph: "!", color: "#8beecf" },
  coding: { glyph: "</>", color: "#78d2ff" },
  testing: { glyph: "QA", color: "#ffbf69" },
  failed: { glyph: "!!", color: "#ff7f7f" },
  retrying: { glyph: "R", color: "#ffd08f" },
  success: { glyph: "*", color: "#99f08d" }
};

const STATUS_LABELS = {
  idle: "대기",
  waiting: "대기 중",
  planning: "기획 중",
  coding: "개발 중",
  testing: "테스트 중",
  failed: "실패",
  retrying: "재시도 중",
  success: "완료"
};

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPixelTile(ctx, x, y, size, colorA, colorB) {
  ctx.fillStyle = colorA;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = colorB;
  ctx.fillRect(x + size / 2, y, size / 2, size / 2);
  ctx.fillRect(x, y + size / 2, size / 2, size / 2);
}

function drawBackground(ctx, canvas) {
  const sky = ctx.createLinearGradient(0, 0, 0, 150);
  sky.addColorStop(0, "#70d7f5");
  sky.addColorStop(1, "#96e8ff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, 90);

  const wall = ctx.createLinearGradient(0, 90, 0, 210);
  wall.addColorStop(0, "#f7f6ee");
  wall.addColorStop(1, "#ddd9cf");
  ctx.fillStyle = wall;
  ctx.fillRect(0, 90, canvas.width, 140);

  ctx.fillStyle = "#5fe0ff";
  for (let i = 0; i < 7; i += 1) {
    roundedRect(ctx, 32 + i * 120, 18, 84, 40, 8);
    ctx.fill();
  }

  ctx.fillStyle = "#f7f0cf";
  for (let i = 0; i < 5; i += 1) {
    roundedRect(ctx, 92 + i * 170, 12, 74, 12, 6);
    ctx.fill();
  }

  for (let x = 0; x < canvas.width; x += 32) {
    for (let y = 180; y < canvas.height; y += 32) {
      const isWood = y < 292;
      drawPixelTile(
        ctx,
        x,
        y,
        32,
        isWood ? "#75553a" : "#b8b5ab",
        isWood ? "#694931" : "#cbc8bf"
      );
    }
  }

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(0, 292, canvas.width, 6);
  ctx.fillRect(364, 54, 12, 450);
  ctx.fillRect(54, 292, 600, 10);
}

function drawDeskCluster(ctx, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const dx = x + i * 92;
    ctx.fillStyle = "#8e6845";
    roundedRect(ctx, dx, y, 58, 36, 8);
    ctx.fill();
    ctx.fillStyle = "#2a343b";
    roundedRect(ctx, dx + 12, y - 18, 30, 16, 6);
    ctx.fill();
    ctx.fillStyle = "#9ae3ff";
    ctx.fillRect(dx + 16, y - 14, 22, 8);
    ctx.fillStyle = "#5d7480";
    roundedRect(ctx, dx + 18, y + 38, 22, 16, 6);
    ctx.fill();
  }
}

function drawRoomFurniture(ctx, roomId, layout) {
  if (roomId === "briefing-room") {
    ctx.fillStyle = "#9f744f";
    roundedRect(ctx, layout.x + 82, layout.y + 86, 118, 54, 12);
    ctx.fill();
    ctx.fillStyle = "#f6f7f0";
    roundedRect(ctx, layout.x + 204, layout.y + 34, 48, 84, 8);
    ctx.fill();
    ctx.fillStyle = "#ff6f6f";
    ctx.fillRect(layout.x + 216, layout.y + 56, 22, 4);
    ctx.fillRect(layout.x + 214, layout.y + 72, 26, 4);
  }

  if (roomId === "build-bay") {
    drawDeskCluster(ctx, layout.x + 52, layout.y + 102, 3);
    ctx.fillStyle = "#c6d4db";
    roundedRect(ctx, layout.x + 330, layout.y + 58, 78, 106, 12);
    ctx.fill();
    ctx.fillStyle = "#66e0c2";
    roundedRect(ctx, layout.x + 344, layout.y + 74, 48, 58, 10);
    ctx.fill();
  }

  if (roomId === "qa-lab") {
    ctx.fillStyle = "#94a8b3";
    roundedRect(ctx, layout.x + 46, layout.y + 92, 70, 40, 10);
    ctx.fill();
    roundedRect(ctx, layout.x + 146, layout.y + 92, 70, 40, 10);
    ctx.fill();
    ctx.fillStyle = "#ffca72";
    roundedRect(ctx, layout.x + 65, layout.y + 70, 28, 18, 8);
    ctx.fill();
    roundedRect(ctx, layout.x + 164, layout.y + 70, 28, 18, 8);
    ctx.fill();
  }

  if (roomId === "incident-desk") {
    ctx.fillStyle = "#8e6845";
    roundedRect(ctx, layout.x + 68, layout.y + 104, 104, 50, 10);
    ctx.fill();
    ctx.fillStyle = "#ff7f7f";
    roundedRect(ctx, layout.x + 170, layout.y + 52, 42, 54, 8);
    ctx.fill();
  }

  if (roomId === "review-desk") {
    ctx.fillStyle = "#8e6845";
    roundedRect(ctx, layout.x + 42, layout.y + 112, 88, 42, 10);
    ctx.fill();
    ctx.fillStyle = "#b8f29e";
    roundedRect(ctx, layout.x + 108, layout.y + 58, 28, 40, 8);
    ctx.fill();
  }
}

function drawRoom(ctx, room, layout, current, tick) {
  const shadowAlpha = current ? 0.26 : 0.14;
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
  roundedRect(ctx, layout.x + 10, layout.y + 12, layout.w, layout.h, 22);
  ctx.fill();

  const grad = ctx.createLinearGradient(layout.x, layout.y, layout.x, layout.y + layout.h);
  grad.addColorStop(0, current ? "#f6f0df" : "#ece7d6");
  grad.addColorStop(1, current ? "#d8d0bc" : "#d2cab6");
  ctx.fillStyle = grad;
  ctx.strokeStyle = current ? "#8beecf" : "rgba(132, 118, 91, 0.28)";
  ctx.lineWidth = current ? 4 : 2;
  roundedRect(ctx, layout.x, layout.y, layout.w, layout.h, 20);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.06)";
  for (let x = layout.x + 16; x < layout.x + layout.w - 16; x += 28) {
    ctx.fillRect(x, layout.y + 56, 1, layout.h - 72);
  }

  drawRoomFurniture(ctx, room.id, layout);

  ctx.fillStyle = "#463629";
  ctx.font = "700 18px sans-serif";
  ctx.fillText(room.label, layout.x + 16, layout.y + 28);
  ctx.fillStyle = "#6f6255";
  ctx.font = "12px sans-serif";
  ctx.fillText(room.description, layout.x + 16, layout.y + 48, layout.w - 32);

  if (current) {
    const glow = 0.18 + Math.sin(tick / 180) * 0.04;
    ctx.fillStyle = `rgba(139,238,207,${glow})`;
    roundedRect(ctx, layout.x - 6, layout.y - 6, layout.w + 12, layout.h + 12, 24);
    ctx.fill();
  }
}

function drawEffect(ctx, status, x, y, tick) {
  const effect = EFFECT_BY_STATUS[status];
  if (!effect) {
    return;
  }

  const floatY = y - 58 + Math.sin(tick / 170) * 4;
  ctx.fillStyle = "rgba(9,17,23,0.92)";
  roundedRect(ctx, x - 20, floatY - 14, 40, 24, 10);
  ctx.fill();
  ctx.strokeStyle = `${effect.color}aa`;
  ctx.lineWidth = 2;
  roundedRect(ctx, x - 20, floatY - 14, 40, 24, 10);
  ctx.stroke();
  ctx.fillStyle = effect.color;
  ctx.font = "700 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(effect.glyph, x, floatY + 2);
  ctx.textAlign = "left";
}

function drawProp(ctx, type, x, y, accent) {
  ctx.fillStyle = accent;
  if (type === "board") {
    roundedRect(ctx, x + 12, y - 2, 14, 14, 4);
    ctx.fill();
  } else if (type === "laptop") {
    roundedRect(ctx, x + 10, y + 2, 16, 10, 4);
    ctx.fill();
  } else if (type === "bug") {
    ctx.beginPath();
    ctx.arc(x + 18, y + 8, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "stamp") {
    roundedRect(ctx, x + 12, y, 12, 12, 4);
    ctx.fill();
  }
}

function drawWorker(ctx, agent, x, y, tick) {
  const visual = AGENT_VISUALS[agent.id];
  const active = agent.active;
  const bob = active ? Math.sin(tick / 160) * 2 : Math.sin(tick / 260) * 1;
  const walk = active ? Math.sin(tick / 90) * 4 : Math.sin(tick / 240) * 1.5;

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y + 28, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#25343d";
  roundedRect(ctx, x - 10, y + 6 + bob, 7, 20 + walk * 0.25, 4);
  ctx.fill();
  roundedRect(ctx, x + 3, y + 6 + bob, 7, 20 - walk * 0.25, 4);
  ctx.fill();

  ctx.fillStyle = visual.color;
  roundedRect(ctx, x - 14, y - 8 + bob, 28, 24, 8);
  ctx.fill();

  ctx.fillStyle = "#f2d2bc";
  ctx.beginPath();
  ctx.arc(x, y - 18 + bob, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#2e2320";
  roundedRect(ctx, x - 10, y - 28 + bob, 20, 8, 4);
  ctx.fill();

  drawProp(ctx, visual.prop, x, y - 4 + bob, visual.accent);

  ctx.fillStyle = "#0b1419";
  roundedRect(ctx, x - 12, y - 46, 24, 14, 7);
  ctx.fill();
  ctx.fillStyle = "#edf8f5";
  ctx.font = "700 9px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(visual.label, x, y - 36);

  if (active || agent.status === "coding" || agent.status === "testing" || agent.status === "retrying") {
    drawEffect(ctx, agent.status, x, y, tick);
  }

  ctx.fillStyle = "#1a262c";
  roundedRect(ctx, x - 18, y + 36, 36, 12, 6);
  ctx.fill();
  ctx.fillStyle = "#edf8f5";
  ctx.font = "700 9px sans-serif";
  ctx.fillText(agent.role, x, y + 45);
  ctx.textAlign = "left";
}

function drawHud(ctx, run) {
  ctx.fillStyle = "rgba(232,242,255,0.92)";
  roundedRect(ctx, 18, 10, 250, 52, 10);
  ctx.fill();
  roundedRect(ctx, 640, 10, 242, 52, 10);
  ctx.fill();

  ctx.fillStyle = "#3b2a64";
  ctx.font = "700 14px sans-serif";
  ctx.fillText(`${run.attempt}차 시도 · ${run.summary.totalEvents}개 이벤트`, 34, 31);
  ctx.font = "700 26px sans-serif";
  ctx.fillText(run.title.slice(0, 16), 34, 54);

  ctx.textAlign = "right";
  ctx.font = "700 16px sans-serif";
  ctx.fillText(`실패 ${run.summary.failures} · 재시도 ${run.summary.retries}`, 864, 31);
  ctx.font = "700 24px sans-serif";
  ctx.fillText(`상태 ${STATUS_LABELS[run.overallStatus] ?? run.overallStatus}`, 864, 54);
  ctx.textAlign = "left";
}

export function OfficeSceneCanvas({ run, rooms }) {
  const canvasRef = useRef(null);
  const positionsRef = useRef({});
  const animationRef = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const ctx = canvas.getContext("2d");
    let frameId = 0;
    const start = performance.now();

    const occupancy = Object.fromEntries(Object.keys(ROOM_LAYOUT).map((roomId) => [roomId, []]));
    for (const agent of run.agentStatuses) {
      if (occupancy[agent.roomId]) {
        occupancy[agent.roomId].push(agent.id);
      }
    }

    function targetPosition(agent) {
      const room = ROOM_LAYOUT[agent.roomId];
      if (room) {
        const slotIndex = Math.max(0, occupancy[agent.roomId].indexOf(agent.id));
        const [x, y] = room.slots[slotIndex] ?? room.slots[room.slots.length - 1];
        return { x, y };
      }

      const [x, y] = HOME_LAYOUT[agent.id];
      return { x, y };
    }

    function animatedTarget(agent, now) {
      const base = targetPosition(agent);
      const spots = ROOM_ACTION_SPOTS[agent.roomId];
      if (!spots?.length) {
        return base;
      }

      const agentAnimation = animationRef.current[agent.id] ?? {
        spotIndex: 0,
        nextShiftAt: now + 1400
      };

      if (now >= agentAnimation.nextShiftAt && (agent.active || agent.status !== "idle")) {
        agentAnimation.spotIndex = (agentAnimation.spotIndex + 1) % spots.length;
        agentAnimation.nextShiftAt = now + 1400 + ((agent.id.charCodeAt(0) + spots.length) % 3) * 420;
      }

      animationRef.current[agent.id] = agentAnimation;
      const [spotX, spotY] = spots[agentAnimation.spotIndex] ?? [base.x, base.y];

      return {
        x: base.x + (spotX - base.x) * 0.32,
        y: base.y + (spotY - base.y) * 0.32
      };
    }

    function draw(now) {
      const tick = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground(ctx, canvas);

      const focus = ROOM_LAYOUT[run.currentRoomId];
      if (focus) {
        ctx.fillStyle = "rgba(0,0,0,0.18)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.clearRect(focus.x - 10, focus.y - 10, focus.w + 20, focus.h + 20);
      }

      drawHud(ctx, run);

      for (const room of rooms) {
        drawRoom(ctx, room, ROOM_LAYOUT[room.id], run.currentRoomId === room.id, tick);
      }

      for (const agent of run.agentStatuses) {
        const target = animatedTarget(agent, now);
        const current = positionsRef.current[agent.id] ?? target;
        const next = {
          x: current.x + (target.x - current.x) * 0.1,
          y: current.y + (target.y - current.y) * 0.1
        };
        positionsRef.current[agent.id] = next;
        drawWorker(ctx, agent, next.x, next.y, tick);
      }

      frameId = requestAnimationFrame(draw);
    }

    frameId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameId);
  }, [rooms, run]);

  return <canvas ref={canvasRef} className="office-canvas" width={900} height={640} />;
}
