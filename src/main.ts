import "./style.css";
import tokens from "../design-tokens.json";
import { showDialogue } from "./engine/narrative/dialogue";
import { bus } from "./engine/events/EventBus";
import { Game } from "./engine/core/Game";
import { maps, FIRST_ROOM, STAGE3_ROOM } from "./maps";
import { loadProgress, hasProgress, clearProgress, saveProgress } from "./engine/core/save";
import { Sfx } from "./engine/audio/sfx";
import { Ambience } from "./engine/audio/ambience";
import type { GameMap } from "./maps/types";
import {
  TITLE_SUB,
  TITLE_MAIN,
  START_LABEL,
  CHAR_SELECT_LABEL,
  CHAR_SELECT_LABEL_STAGE3,
  CREDIT,
  CREDIT_URL,
  CONTACT_EMAIL,
  CONTACT_CATEGORIES,
  ALLOW_CONTINUE,
  GIFT_TIERS,
  HIDDEN_MAX_FAILS,
  FULLSCREEN,
} from "./config";
import {
  showStage1Escape,
  showGiftKiosk,
  playGlitch,
  showStage3Escape,
  showGameOut,
  playZoneCard,
  playEmergencyWake,
  type GiftTier,
} from "./stage/screens";
import { setupQuarantine } from "./stage/quarantine";
import { QZ_ZONES } from "./maps/quarantine-room";
import { puzzles } from "./registry";
import { sessionStats } from "./engine/core/stats";

/** design-tokens.json → :root CSS 변수 주입 (색·치수 단일 소스) */
function applyTokens(): void {
  const root = document.documentElement.style;
  for (const [name, value] of Object.entries(tokens.color)) {
    root.setProperty(`--color-${name}`, value);
  }
  root.setProperty("--stroke-outline", `${tokens.stroke.outline}px`);
  root.setProperty("--glow-blur", `${tokens.stroke["glow-blur"]}px`);
  root.setProperty("--corner-radius", `${tokens["corner-radius"]}px`);
  root.setProperty("--font-family", tokens.font.family);
  root.setProperty("--font-holo-letter-spacing", tokens.font["holo-letter-spacing"]);
}

/** 문의하기 — Netlify Forms 제출, 실패 시(로컬 실행 등) 메일 앱 폴백 */
function showContactForm(app: HTMLElement): void {
  const overlay = document.createElement("div");
  overlay.className = "contact-overlay";
  overlay.dataset.testid = "contact-overlay";

  const panel = document.createElement("form");
  panel.className = "contact-panel";

  const title = document.createElement("div");
  title.className = "contact-title";
  title.textContent = "문의하기";

  const fieldset = document.createElement("fieldset");
  fieldset.className = "contact-categories";
  for (const [i, label] of CONTACT_CATEGORIES.entries()) {
    const wrap = document.createElement("label");
    wrap.className = "contact-radio";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "category";
    radio.value = label;
    radio.checked = i === 0;
    wrap.append(radio, document.createTextNode(label));
    fieldset.appendChild(wrap);
  }

  const textarea = document.createElement("textarea");
  textarea.className = "contact-textarea";
  textarea.name = "message";
  textarea.dataset.testid = "contact-message";
  textarea.placeholder = "내용을 적어 주세요. 버그라면 어느 장치에서 무슨 일이 있었는지 알려 주시면 큰 도움이 됩니다.";
  textarea.rows = 5;

  const status = document.createElement("div");
  status.className = "contact-status";
  status.dataset.testid = "contact-status";

  const actions = document.createElement("div");
  actions.className = "contact-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "title-start contact-btn";
  cancel.dataset.testid = "contact-close";
  cancel.textContent = "닫기";
  const send = document.createElement("button");
  send.type = "submit";
  send.className = "title-start contact-btn";
  send.dataset.testid = "contact-submit";
  send.textContent = "제출";
  actions.append(cancel, send);

  const close = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
  };
  document.addEventListener("keydown", onKey);
  cancel.addEventListener("click", close);

  panel.addEventListener("submit", (e) => {
    e.preventDefault();
    const checked = panel.querySelector<HTMLInputElement>('input[name="category"]:checked');
    const category = checked?.value ?? CONTACT_CATEGORIES[0];
    const message = textarea.value.trim();
    if (!message) {
      status.textContent = "내용을 입력해 주세요.";
      return;
    }
    send.disabled = true;
    status.textContent = "보내는 중…";
    void fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ "form-name": "contact", category, message }).toString(),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        Sfx.confirm();
        status.textContent = "전송 완료! 소중한 의견 감사합니다.";
        setTimeout(close, 1500);
      })
      .catch(() => {
        // 로컬 실행·폼 미설정 등 — 기기의 메일 앱으로 폴백
        const subject = encodeURIComponent(`[${TITLE_SUB}] ${category}`);
        const body = encodeURIComponent(message);
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
        status.textContent = "전송 서버에 연결하지 못해 메일 앱을 엽니다.";
        send.disabled = false;
      });
  });

  panel.append(title, fieldset, textarea, status, actions);
  overlay.appendChild(panel);
  app.appendChild(overlay);
  textarea.focus();
}

function showTitle(app: HTMLElement): void {
  const screen = document.createElement("div");
  screen.className = "title-screen";
  screen.dataset.testid = "title-screen";

  const sub = document.createElement("div");
  sub.className = "title-sub";
  sub.textContent = TITLE_SUB;

  const main = document.createElement("h1");
  main.className = "title-main";
  // 작은 영문 시리즈명 + 큰 한글 부제. 한 방 이름을 부제로 쓰면 방이 늘었을 때
  // 한 방이 전체를 대표하는 꼴이 된다. 브라우저·링크 제목은 index.html이 따로 들고 있다.
  main.textContent = TITLE_MAIN;

  const buttons = document.createElement("div");
  buttons.className = "title-buttons";

  // 저장된 진행이 있으면 '이어하기'를 먼저 노출 (축제 부스판은 ALLOW_CONTINUE=false로 끈다)
  if (ALLOW_CONTINUE && hasProgress()) {
    const cont = document.createElement("button");
    cont.className = "title-start";
    cont.dataset.testid = "continue-button";
    cont.textContent = "이어하기";
    cont.addEventListener("click", () => {
      Sfx.confirm();
      Ambience.start(); // 사용자 제스처 안 — autoplay 정책 안전
      screen.remove();
      void startContinue(app);
    });
    buttons.appendChild(cont);
  }

  const start = document.createElement("button");
  start.className = "title-start";
  start.dataset.testid = "start-button";
  start.textContent = ALLOW_CONTINUE && hasProgress() ? "처음부터" : START_LABEL;
  start.addEventListener("click", () => {
    Sfx.confirm();
    Ambience.start();
    clearProgress();
    screen.remove();
    void showCharSelect(app).then((character) => {
      saveProgress({ events: [], notes: [], character });
      void startPrologue(app);
    });
  });
  buttons.appendChild(start);

  const footer = document.createElement("div");
  footer.className = "title-footer";
  const credit = document.createElement("a");
  credit.className = "title-credit";
  credit.href = CREDIT_URL;
  credit.target = "_blank";
  credit.rel = "noopener";
  credit.textContent = CREDIT;
  const contact = document.createElement("button");
  contact.className = "title-contact";
  contact.dataset.testid = "contact-button";
  contact.textContent = "문의하기";
  contact.addEventListener("click", () => {
    Sfx.select();
    showContactForm(app);
  });
  footer.append(credit, contact);

  screen.append(sub, main, buttons, footer);
  app.appendChild(screen);
}

/** 새 시작 시 캐릭터 선택 — 픽셀 스프라이트 2종 중 탭 */
function showCharSelect(app: HTMLElement, label = CHAR_SELECT_LABEL): Promise<"m" | "f"> {
  return new Promise((resolve) => {
    const screen = document.createElement("div");
    screen.className = "char-select";
    screen.dataset.testid = "char-select";

    const title = document.createElement("div");
    title.className = "title-sub";
    title.textContent = label;

    const row = document.createElement("div");
    row.className = "char-select-row";

    const BASE = import.meta.env.BASE_URL;
    for (const g of ["m", "f"] as const) {
      const btn = document.createElement("button");
      btn.className = "char-select-btn";
      btn.dataset.testid = `char-${g}`;
      const img = document.createElement("img");
      img.src = `${BASE}assets/char-${g}-se-idle.png`;
      img.alt = g === "m" ? "남학생" : "여학생";
      btn.appendChild(img);
      btn.addEventListener("click", () => {
        Sfx.confirm();
        screen.remove();
        resolve(g);
      });
      row.appendChild(btn);
    }

    screen.append(title, row);
    app.appendChild(screen);
  });
}

/** 방별 배선 — 방에 처음 들어설 때 한 번만 실행할 것들.
 *
 *  ⚠ **`new Game(...)` 전에 호출해야 한다.** `map:enter`는 첫 방에서도 발화하는데
 *  (`Game.start()` 끝), 그 뒤에 구독하면 첫 방의 발화를 놓친다.
 *
 *  방 인트로 대사도 같은 자리에 건다:
 *
 *    const shown = new Set<string>();
 *    bus.on(`map:enter:<방 id>`, () => {
 *      if (shown.has("<방 id>")) return;
 *      shown.add("<방 id>");
 *      void showDialogue("#<인트로 앵커>", app);
 *    });
 *
 *  다만 첫 방의 인트로는 프롤로그 대사 **뒤에** 와야 순서가 맞으므로
 *  startPrologue에서 직접 재생한다 (map:enter는 start() 시점 = 튜토리얼보다 앞이다). */
function registerRoomFx(app: HTMLElement): void {
  // STAGE 1 출구 → 선물 교환 코드 발급 화면 (엔진은 문에서 'stage1:escaped'만 쏜다)
  bus.on("stage1:escaped", () => {
    void showDialogue("#lab-escape", app).then(() => showStage1Escape(app));
  });
}

async function startPrologue(app: HTMLElement): Promise<void> {
  document.body.dataset.stage = "1";
  await showDialogue("#prologue-wake", app);
  registerRoomFx(app);

  const game = new Game(app, FIRST_ROOM);
  await game.start();
  bus.emit("prologue:done");

  await showDialogue("#prologue-tutorial", app);
  await showDialogue("#prologue-rule", app); // 보안코드 세 자리는 장치 세 대에 나뉘어 있다
}

/** 이어하기: 프롤로그 생략, 마지막 방에서 재개 (ALLOW_CONTINUE일 때만) */
async function startContinue(app: HTMLElement): Promise<void> {
  const saved = loadProgress();
  const startMap: GameMap = (saved.lastMap && maps[saved.lastMap]) || FIRST_ROOM;
  registerRoomFx(app);

  const game = new Game(app, startMap);
  await game.start();
  bus.emit("prologue:done");
}

// ───────────── STAGE 2 → STAGE 3 (생물실 컴퓨터: ?stage=2) ─────────────

const GIFT_KEY = "gs-biolab-escape:gift";
const CHAR_KEY = "gs-biolab-escape:char";

/** STAGE 2: 선물 교환 키오스크 → 글리치 → STAGE 3 */
async function startStage2(app: HTMLElement): Promise<void> {
  document.body.dataset.stage = "2";
  const { tier, character, screen } = await showGiftKiosk(app);
  try {
    sessionStorage.setItem(GIFT_KEY, tier.code);
    sessionStorage.setItem(CHAR_KEY, character);
  } catch {
    /* 사생활 모드 등 — 재도전 시 선물 표시·캐릭터 기억만 빠진다 */
  }
  Ambience.start(); // 키오스크 Enter = 사용자 제스처
  await playGlitch(app, screen); // 밝은 키오스크가 그 자리에서 깨진다
  await startStage3(app, tier, character);
}

/** STAGE 3: 격리 구역 3-1 → 3-2 → 3-3 → (히든). ?stage=3[&zone=qz-2] 재도전은 여기로 곧장 들어온다 */
async function startStage3(
  app: HTMLElement,
  tier: GiftTier | null,
  chosen?: "m" | "f",
  startZone = "qz-1",
): Promise<void> {
  document.body.dataset.stage = "3";
  clearProgress();
  // 키오스크에서 이미 골랐으면 묻지 않는다 — 글리치와 격리 구역 사이에 화면이 끼면 공포가 끊긴다
  const character = chosen ?? (await showCharSelect(app, CHAR_SELECT_LABEL_STAGE3));
  Ambience.start(); // ?stage=3 재도전 경로에서는 캐릭터 클릭이 사용자 제스처
  saveProgress({ events: [], notes: [], character });
  try {
    sessionStorage.setItem(CHAR_KEY, character); // GAME OUT 뒤 재도전 때 다시 묻지 않는다
  } catch {
    /* 무시 */
  }

  const zone0 = QZ_ZONES.find((z) => z.id === startZone) ?? QZ_ZONES[0];
  let currentZone: string = zone0.id;
  const qz = setupQuarantine(app, {
    solveEvents: puzzles.filter((p) => p.manifest.act === 3).map((p) => p.manifest.reward.event),
    atpBoostEvent: "code:mito-solved",
    onGameOut: (reason) => void showGameOut(app, reason, currentZone),
  });
  bus.on("stage3:escaped", () => {
    qz.stop();
    void showDialogue("#qz-escape", app).then(() => showStage3Escape(app, tier));
  });
  // 3-3 철문 — 오답이 적었으면 히든 스테이지, 아니면 탈출
  bus.on("stage3:zone3-cleared", () => {
    if (sessionStats.fails <= HIDDEN_MAX_FAILS) game.enterMap("qz-hidden");
    else bus.emit("stage3:escaped");
  });
  // 구역 진입 — 첫 구역 말고는 철문을 지나 들어온 것: 타이틀 카드 → 구역 대사
  const zoneIntro: Record<string, string> = {
    "qz-2": "#qz-zone2-intro",
    "qz-3": "#qz-zone3-intro",
    "qz-hidden": "#qz-hidden-intro",
  };
  for (const z of QZ_ZONES) {
    bus.on(`map:enter:${z.id}`, () => {
      const first = z.id === zone0.id && currentZone === zone0.id && !qzStarted;
      currentZone = z.id;
      qz.enterZone(z.id, first);
      if (first) return;
      void playZoneCard(app, z.label, z.name).then(() => showDialogue(zoneIntro[z.id] ?? "#qz-door-locked", app));
    });
  }

  let qzStarted = false;
  const game = new Game(app, maps[zone0.id] ?? STAGE3_ROOM);
  await game.start();
  qzStarted = true;
  bus.emit("prologue:done");
  await playEmergencyWake(app); // 칠흑 → 비상등 깜빡임 → 쾅
  await playZoneCard(app, zone0.label, zone0.name);
  if (zone0.id === "qz-1") {
    await showDialogue("#qz-intro", app);
    await showDialogue("#qz-rule", app);
  } else {
    await showDialogue(zoneIntro[zone0.id] ?? "#qz-rule", app);
  }
  qz.begin();
}

/** 전체화면 — 브라우저는 사용자 입력 없이 허용하지 않으므로 클릭·키 입력 때마다 다시 시도한다 */
function keepFullscreen(): void {
  if (!FULLSCREEN) return;
  const enter = () => {
    if (document.fullscreenElement || !document.documentElement.requestFullscreen) return;
    document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => {
      /* 미리보기 창 등 전체화면을 막는 환경 — 그냥 창 크기로 진행 */
    });
  };
  window.addEventListener("pointerdown", enter, true);
  window.addEventListener("keydown", enter, true);
}
const app = document.getElementById("app");
if (!app) throw new Error("#app 루트가 없습니다");
applyTokens();
keepFullscreen();

const stage = new URLSearchParams(location.search).get("stage");
if (stage === "2") {
  void startStage2(app);
} else if (stage === "3") {
  let tier: GiftTier | null = null;
  let character: "m" | "f" | undefined;
  try {
    const code = sessionStorage.getItem(GIFT_KEY);
    tier = GIFT_TIERS.find((t) => t.code === code) ?? null;
    const c = sessionStorage.getItem(CHAR_KEY);
    if (c === "m" || c === "f") character = c;
  } catch {
    /* 무시 */
  }
  const zone = new URLSearchParams(location.search).get("zone") ?? "qz-1";
  void startStage3(app, tier, character, zone);
} else {
  showTitle(app);
}
