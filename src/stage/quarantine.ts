/**
 * STAGE 3 생존 시스템 — 좀비와의 거리 · 잔여 산소 · ATP HUD + 공포 연출.
 *
 * 엔진은 이 파일을 모른다. 이벤트 버스로만 엮인다:
 *   듣는 것  puzzle:fail · code:wrong (오답 → 좀비 접근)
 *            opts.atpBoostEvent (발전기 해결 → ATP 상한 증가 — 다른 회복은 없다)
 *            stage3:escaped (탈출)
 *   보내는 것 player:speed (ATP 고갈 시 이동 둔화) · player:collapse (GAME OUT 직전 쓰러짐)
 *
 * 연출 (모두 혐오 이미지 없이 — 어둠·빛·소리·유리만):
 *   손전등       F 키 / 화면 버튼으로 켜고 끈다. 끄면 칠흑이지만 좀비가 느려진다.
 *   페이드아웃   좀비가 가까울수록·산소와 ATP가 희박할수록 화면이 점점 어두워진다.
 *   유리 금      좀비 거리가 CRACK_STEPS_M을 지날 때마다 화면 유리에 금이 하나씩 더 간다.
 *   흔들림       QUAKE_EVERY_S(40초)마다 한 번 — 쾅쾅 소리와 함께.
 *   GAME OUT     거리 0.0m 또는 산소 0 → 수치가 모두 0으로 떨어지고 캐릭터가 쓰러진 뒤 암전.
 * 타이밍은 시드 고정 난수 — 런타임 Math.random 금지(재현성) 규칙을 따른다.
 */
import { bus } from "../engine/events/EventBus";
import { Sfx } from "../engine/audio/sfx";
import {
  ZOMBIE_START_M,
  ZOMBIE_SPEED_MPS,
  ZOMBIE_WRONG_M,
  O2_DRAIN_PER_S,
  ATP_START,
  ATP_MAX,
  ATP_MOVE_COST_PER_S,
  ATP_REST_GAIN_PER_S,
  ATP_EMPTY_SPEED,
  ZONE_ZOMBIE_SPEEDUP,
  QUAKE_EVERY_S,
  FLASHLIGHT_OFF_ZOMBIE,
  FADE_ZOMBIE_M,
  FADE_O2,
  FADE_ATP,
  CRACK_STEPS_M,
} from "../config";

/** 시드 고정 난수 (mulberry32) */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 유리 금 SVG — CRACK_STEPS_M 단계 수만큼 충격점을 만들고, 점마다 방사형 금 + 동심 고리.
 * 시드 고정이라 매번 같은 모양. 단계 i는 data-i로 표시해 CSS가 하나씩 드러낸다.
 */
function buildCracks(): SVGSVGElement {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 1600 900");
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  svg.classList.add("qz-cracks");
  const r = rng(7331);
  // 충격점 — 화면 가장자리 쪽 (가운데 캐릭터를 가리지 않게)
  const impacts: [number, number][] = [
    [1430, 140], [170, 760], [1360, 780], [240, 150], [800, 70],
  ];
  impacts.slice(0, CRACK_STEPS_M.length).forEach(([cx, cy], i) => {
    const g = document.createElementNS(NS, "g");
    g.dataset.i = String(i);
    const paths: string[] = [];
    const rays = 9 + Math.floor(r() * 5);
    for (let k = 0; k < rays; k++) {
      let ang = (k / rays) * Math.PI * 2 + r() * 0.5;
      let x = cx;
      let y = cy;
      let d = `M${x.toFixed(0)},${y.toFixed(0)}`;
      const len = 160 + r() * 320;
      const segs = 5 + Math.floor(r() * 4);
      for (let s = 0; s < segs; s++) {
        ang += (r() - 0.5) * 0.55;
        x += Math.cos(ang) * (len / segs);
        y += Math.sin(ang) * (len / segs);
        d += ` L${x.toFixed(0)},${y.toFixed(0)}`;
        // 곁가지
        if (r() < 0.3) {
          const b = ang + (r() < 0.5 ? 0.7 : -0.7);
          paths.push(`M${x.toFixed(0)},${y.toFixed(0)} l${(Math.cos(b) * 50).toFixed(0)},${(Math.sin(b) * 50).toFixed(0)}`);
        }
      }
      paths.push(d);
    }
    // 동심 고리 두 겹 (들쭉날쭉한 다각형)
    for (const rad of [26 + r() * 10, 64 + r() * 20]) {
      const n = 11;
      let d = "";
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * Math.PI * 2;
        const rr = rad * (0.8 + r() * 0.4);
        d += `${k ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(0)},${(cy + Math.sin(a) * rr).toFixed(0)} `;
      }
      paths.push(d);
    }
    for (const cls of ["shade", "line"]) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", paths.join(" "));
      p.setAttribute("class", cls);
      g.appendChild(p);
    }
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", String(cx));
    dot.setAttribute("cy", String(cy));
    dot.setAttribute("r", "9");
    dot.setAttribute("class", "core");
    g.appendChild(dot);
    svg.appendChild(g);
  });
  return svg;
}

interface Options {
  /** 장치 해결 보상 이벤트 전부 (STAGE 3 퍼즐들) */
  solveEvents: string[];
  /** 발전기(ATP 상한↑) 이벤트 */
  atpBoostEvent: string;
  /** GAME OUT — 쓰러짐 연출이 끝난 뒤 불린다 */
  onGameOut: (reason: string) => void;
}

export interface QuarantineHandle {
  /** 수치 감소·연출 시작 (도입 대사가 끝난 뒤) */
  begin(): void;
  /** 다음 구역으로 넘어왔다 — 속도 배율·유리만 바뀐다. 거리·산소·ATP는 그대로 이어진다 */
  enterZone(zoneId: string, first: boolean): void;
  stop(): void;
}

export function setupQuarantine(app: HTMLElement, h: Options): QuarantineHandle {
  document.body.dataset.stage = "3";

  // ── DOM: 비네트(손전등) · 그림자 · 붉은 테두리 · 유리 금 · 페이드 · HUD · 손전등 버튼 ──
  const vignette = document.createElement("div");
  vignette.className = "qz-vignette";
  const shadow = document.createElement("div");
  shadow.className = "qz-shadow";
  const edge = document.createElement("div");
  edge.className = "qz-edge";
  const cracks = buildCracks();
  const fade = document.createElement("div");
  fade.className = "qz-fade";
  fade.dataset.testid = "qz-fade";
  const hud = document.createElement("div");
  hud.className = "qz-hud";
  hud.dataset.testid = "qz-hud";
  const row = (key: string, label: string) => {
    const r = document.createElement("div");
    r.className = "qz-row";
    r.dataset.key = key;
    const l = document.createElement("span");
    l.className = "qz-label";
    l.textContent = label;
    const bar = document.createElement("span");
    bar.className = "qz-bar";
    const fill = document.createElement("i");
    bar.appendChild(fill);
    const v = document.createElement("span");
    v.className = "qz-val";
    v.dataset.testid = `qz-${key}`;
    r.append(l, bar, v);
    hud.appendChild(r);
    return { r, fill, v };
  };
  const zoneTag = document.createElement("div");
  zoneTag.className = "qz-zone";
  zoneTag.dataset.testid = "qz-zone";
  hud.prepend(zoneTag);
  const zRow = row("zombie", "좀비 거리");
  const oRow = row("o2", "잔여 산소");
  const aRow = row("atp", "ATP");
  const torch = document.createElement("button");
  torch.className = "qz-torch on";
  torch.type = "button";
  torch.dataset.testid = "qz-torch";
  hud.appendChild(torch);
  app.append(vignette, shadow, edge, cracks, fade, hud);

  // ── 상태 ──
  let zombie = ZOMBIE_START_M;
  let o2 = 100;
  let atp = ATP_START;
  let atpMax = ATP_MAX;
  let running = false;
  let ended = false;
  let slowed = false;
  let zoneSpeed = 1;
  let torchOn = true;
  let crackLevel = 0;
  const rand = rng(20251106);
  let nextScare = 14 + rand() * 10;
  let nextQuake = QUAKE_EVERY_S;
  let nextBeat = 0;
  let t = 0;
  let lastPos: [number, number] | null = null;

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  const paint = () => {
    zRow.v.textContent = `${Math.max(0, zombie).toFixed(1)} m`;
    zRow.fill.style.width = `${clamp01(zombie / ZOMBIE_START_M) * 100}%`;
    zRow.r.classList.toggle("low", zombie < 35);
    oRow.v.textContent = `${Math.max(0, Math.ceil(o2))} %`;
    oRow.fill.style.width = `${Math.max(0, o2)}%`;
    oRow.r.classList.toggle("low", o2 < 25);
    aRow.v.textContent = `${Math.max(0, Math.floor(atp))}`;
    aRow.fill.style.width = `${clamp01(atp / atpMax) * 100}%`;
    aRow.r.classList.toggle("low", atp < 8);
    // 가까울수록 화면 가장자리가 붉게
    edge.style.opacity = String(Math.min(0.85, clamp01((40 - zombie) / 40)));
    // 점점 페이드아웃 — 가장 위험한 수치가 정한다 (ATP는 절반만 반영)
    if (!ended) {
      const danger = Math.max(
        clamp01(1 - zombie / FADE_ZOMBIE_M),
        clamp01(1 - o2 / FADE_O2),
        clamp01(1 - atp / FADE_ATP) * 0.5,
      );
      fade.style.opacity = (danger * 0.7).toFixed(3);
    }
    // 유리 금 — 단계는 올라가기만 한다(구역이 바뀌면 새 유리)
    const lvl = CRACK_STEPS_M.filter((m) => zombie < m).length;
    if (lvl > crackLevel) {
      crackLevel = lvl;
      cracks.dataset.level = String(lvl);
      Sfx.glitch();
      cracks.classList.remove("hit");
      void cracks.getBoundingClientRect();
      cracks.classList.add("hit");
    }
  };
  const paintTorch = () => {
    torch.textContent = torchOn ? "손전등 ON [F]" : "손전등 OFF [F]";
    torch.classList.toggle("on", torchOn);
    vignette.classList.toggle("off", !torchOn);
  };
  paint();
  paintTorch();

  const shake = () => {
    app.classList.remove("qz-shake");
    void app.offsetWidth;
    app.classList.add("qz-shake");
    setTimeout(() => app.classList.remove("qz-shake"), 600);
  };
  const flicker = () => {
    vignette.classList.remove("flicker");
    void vignette.offsetWidth;
    vignette.classList.add("flicker");
  };

  /** 언제 무엇이 튀어나올지 모르는 연출 — 흔들림은 40초 주기 전용이라 여기선 쓰지 않는다 */
  const scare = () => {
    const r = rand();
    if (r < 0.35) {
      flicker();
      Sfx.glitch();
    } else if (r < 0.7) {
      shadow.classList.remove("pass", "pass-rev");
      void shadow.offsetWidth;
      shadow.classList.add(rand() < 0.5 ? "pass" : "pass-rev");
      Sfx.heartbeat();
    } else if (r < 0.85) {
      Sfx.thud(); // 소리만 — 멀리서 쾅
    } else {
      Sfx.alarm();
      flicker();
    }
  };
  /** 40초마다 — 좀비가 문을 들이받는다 */
  const quake = () => {
    Sfx.thud();
    setTimeout(() => Sfx.thud(), 260);
    shake();
  };

  /** GAME OUT — 수치가 0으로 떨어지고, 쓰러지고, 암전 */
  const end = (reason: string) => {
    if (ended) return;
    ended = true;
    running = false;
    zombie = 0;
    o2 = 0;
    atp = 0;
    paint();
    zRow.v.textContent = "0.0 m";
    hud.classList.add("dead");
    Sfx.thud();
    shake();
    bus.emit("player:collapse");
    fade.classList.add("final");
    setTimeout(() => {
      Sfx.heartbeat();
    }, 700);
    setTimeout(() => h.onGameOut(reason), 2600);
  };

  // ── 이벤트 배선 ──
  const offs: (() => void)[] = [];
  const wrong = () => {
    if (!running) return;
    zombie -= ZOMBIE_WRONG_M;
    Sfx.thud();
    paint();
  };
  offs.push(bus.on("puzzle:fail", wrong), bus.on("code:wrong", wrong));
  // 장치를 풀어도 거리·산소·ATP는 회복되지 않는다 — 3-1부터 끝까지 수치가 그대로 이어진다.
  // 발전기(마이토콘드리아)만 ATP '상한'을 늘려 준다 (지금 ATP 값은 그대로).
  for (const ev of h.solveEvents) {
    if (ev !== h.atpBoostEvent) continue;
    offs.push(
      bus.on(ev, () => {
        atpMax = ATP_MAX * 1.5;
        paint();
      }),
    );
  }
  offs.push(
    bus.on("stage3:escaped", () => {
      running = false;
      ended = true;
      fade.style.opacity = "0";
    }),
  );

  // 손전등 — F 키 / 버튼. 입력칸에 글자를 치는 중에는 무시한다
  const toggleTorch = () => {
    if (ended) return;
    torchOn = !torchOn;
    Sfx.select();
    paintTorch();
  };
  torch.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleTorch();
    torch.blur();
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.code !== "KeyF" || e.repeat) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    toggleTorch();
  };
  window.addEventListener("keydown", onKey);
  offs.push(() => window.removeEventListener("keydown", onKey));

  // ?grid 디버그·e2e 전용 — 수치를 직접 넣어 연출(금·페이드·GAME OUT)을 확인한다
  if (new URLSearchParams(location.search).has("grid")) {
    (window as unknown as { __qz: object }).__qz = {
      set(v: { zombie?: number; o2?: number; atp?: number }) {
        if (v.zombie != null) zombie = v.zombie;
        if (v.o2 != null) o2 = v.o2;
        if (v.atp != null) atp = v.atp;
        paint();
      },
      get state() {
        return { zombie, o2, atp, torchOn, crackLevel, ended };
      },
    };
  }

  // ── 루프 (250ms) ──
  const DT = 0.25;
  const timer = setInterval(() => {
    if (!running || ended) return;
    t += DT;
    const qe = (window as unknown as { __qe?: { player: { x: number; y: number } } }).__qe;
    let moved = false;
    if (qe) {
      const p: [number, number] = [qe.player.x, qe.player.y];
      if (lastPos) moved = Math.hypot(p[0] - lastPos[0], p[1] - lastPos[1]) > 0.02;
      lastPos = p;
    }
    // 퍼즐·대사 중에도 시간은 흐른다(방탈출). 다만 화면이 가려진 동안 연출 소리는 줄인다.
    const busy = !!document.querySelector(".puzzle-overlay, .dialogue-box");
    zombie -= ZOMBIE_SPEED_MPS * zoneSpeed * (torchOn ? 1 : FLASHLIGHT_OFF_ZOMBIE) * DT;
    o2 -= O2_DRAIN_PER_S * DT;
    atp = moved
      ? Math.max(0, atp - ATP_MOVE_COST_PER_S * DT)
      : Math.min(atpMax, atp + ATP_REST_GAIN_PER_S * DT);
    const shouldSlow = atp <= 0.01;
    if (shouldSlow !== slowed) {
      slowed = shouldSlow;
      bus.emit("player:speed", slowed ? ATP_EMPTY_SPEED : 1);
      aRow.r.classList.toggle("empty", slowed);
    }
    paint();

    if (t >= nextQuake) {
      quake();
      nextQuake = t + QUAKE_EVERY_S;
    }
    if (t >= nextScare) {
      if (!busy) scare();
      nextScare = t + (zombie < 40 ? 7 + rand() * 8 : 16 + rand() * 18);
    }
    if (zombie < 30 && t >= nextBeat) {
      Sfx.heartbeat();
      nextBeat = t + 0.35 + (zombie / 30) * 0.9;
    }
    if (zombie <= 0) end("좀비가 격리 구역 안으로 들어왔다.");
    else if (o2 <= 0) end("산소가 바닥났다. 세포호흡을 이어 갈 수 없다.");
  }, DT * 1000);

  return {
    begin() {
      running = true;
    },
    enterZone(zoneId, _first) {
      zoneSpeed = ZONE_ZOMBIE_SPEEDUP[zoneId] ?? 1;
      zoneTag.textContent = zoneId === "qz-hidden" ? "HIDDEN" : `STAGE ${zoneId.replace("qz-", "3-")}`;
      // 새 구역 = 새 유리
      crackLevel = 0;
      cracks.dataset.level = "0";
      paint();
    },
    stop() {
      running = false;
      clearInterval(timer);
      offs.forEach((o) => o());
    },
  };
}
