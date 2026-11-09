/**
 * 스테이지 사이 화면 — STAGE 1 탈출(선물 코드 발급) · STAGE 2 선물 교환 키오스크 ·
 * 글리치 전환 · STAGE 3 생존/실패 화면. 엔진 밖(게임 고유 연출)이라 src/stage/에 둔다.
 *
 * 축제 부스 운영 흐름:
 *   부스 컴퓨터  : 기본 주소 → STAGE 1 → 탈출 화면에 선물 코드 → [Enter] 다음 손님
 *   생물실 컴퓨터: 주소 끝에 ?stage=2 → 키오스크 → 코드 입력 → 글리치 → STAGE 3
 *   STAGE 3 재도전: ?stage=3 (글리치 없이 곧장 격리 구역)
 */
import { Sfx } from "../engine/audio/sfx";
import { sessionStats } from "../engine/core/stats";
import { GIFT_TIERS, GIFT_KIOSK_TITLE, GIFT_KIOSK_HELP } from "../config";

export type GiftTier = (typeof GIFT_TIERS)[number];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};

const playTime = () => {
  const ms = sessionStats.playMs();
  return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
};

/** 키 하나를 기다린다 (캡처 단계에서 잡아 게임으로 새지 않게) */
function waitKey(keys: string[]): Promise<void> {
  return new Promise((resolve) => {
    const on = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (!keys.includes(e.key) || e.repeat) return;
      e.preventDefault();
      window.removeEventListener("keydown", on, true);
      resolve();
    };
    window.addEventListener("keydown", on, true);
  });
}

/** 오답 수 → 선물 등급 */
export function tierForFails(fails: number): GiftTier {
  return GIFT_TIERS.find((t) => fails <= t.maxFails) ?? GIFT_TIERS[GIFT_TIERS.length - 1];
}

/** STAGE 1 탈출 화면 — 선물 교환 코드 발급. Enter를 누르면 다음 손님(타이틀) */
export async function showStage1Escape(app: HTMLElement): Promise<void> {
  const tier = tierForFails(sessionStats.fails);
  const screen = el("div", "stage-screen stage1-escape");
  screen.dataset.testid = "stage1-escape";
  screen.append(
    el("div", "stage-kicker", "STAGE 1 CLEAR"),
    el("h1", "stage-title", "연구소 견학 미션 성공!"),
    el("p", "stage-text", "생물실로 이동해 아래 선물 교환 코드를 입력하세요"),
  );
  const code = el("div", "gift-code", tier.code);
  code.dataset.testid = "gift-code";
  screen.append(
    code,
    el("p", "stage-meta", `오답 ${sessionStats.fails}회 · 힌트 ${sessionStats.hintsUsed}회 · 플레이 ${playTime()}`),
    el("p", "stage-foot", "[Enter] 다음 손님"),
  );
  app.appendChild(screen);
  Sfx.success();
  await waitKey(["Enter"]);
  location.href = location.pathname; // 타이틀로 (진행 초기화는 시작할 때)
}

export interface KioskResult {
  tier: GiftTier;
  character: "m" | "f";
  /** 키오스크 화면 — 글리치가 이 화면 자체를 깨뜨린 뒤 지운다 */
  screen: HTMLElement;
}

/**
 * STAGE 2 — 선물 교환 키오스크 (밝은 화면). 견학증 사진(캐릭터)을 고르고 코드를 넣는다.
 * 캐릭터 선택을 여기서 끝내 두는 이유: 글리치 직후에 선택 화면이 끼면 공포가 끊긴다.
 * 등록된 코드가 들어오면 화면을 지우지 않은 채 resolve — 다음 글리치가 이 화면을 깨뜨린다.
 */
export function showGiftKiosk(app: HTMLElement): Promise<KioskResult> {
  return new Promise((resolve) => {
    const BASE = import.meta.env.BASE_URL;
    const screen = el("div", "stage-screen kiosk");
    screen.dataset.testid = "gift-kiosk";
    const card = el("form", "kiosk-card");
    card.append(el("div", "stage-kicker", "BIO ROOM · GIFT EXCHANGE"), el("h1", "stage-title", GIFT_KIOSK_TITLE));

    // 견학증 사진 고르기 (= STAGE 3 캐릭터)
    let character: "m" | "f" = "m";
    const pick = el("div", "kiosk-pick");
    const picks = (["m", "f"] as const).map((g) => {
      const b = el("button", "kiosk-avatar");
      b.type = "button";
      b.dataset.testid = `kiosk-char-${g}`;
      const img = el("img");
      img.src = `${BASE}assets/char-${g}-se-idle.png`;
      img.alt = g === "m" ? "남학생" : "여학생";
      b.appendChild(img);
      b.addEventListener("click", () => {
        character = g;
        picks.forEach((p) => p.classList.toggle("on", p === b));
        Sfx.select();
        input.focus();
      });
      pick.appendChild(b);
      return b;
    });
    picks[0].classList.add("on");

    const input = el("input", "kiosk-input");
    input.dataset.testid = "gift-input";
    input.placeholder = "CELL-XXXX";
    input.autocomplete = "off";
    input.spellcheck = false;
    const msg = el("p", "kiosk-msg");
    msg.dataset.testid = "gift-msg";
    card.append(
      el("p", "stage-text", "① 견학증 사진을 고르세요"),
      pick,
      el("p", "stage-text", `② ${GIFT_KIOSK_HELP}`),
      input,
      msg,
      el("p", "stage-foot", "[Enter] 확인"),
    );
    screen.appendChild(card);
    app.appendChild(screen);
    input.focus();
    card.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = input.value.trim().toUpperCase();
      const tier = GIFT_TIERS.find((t) => t.code === v);
      if (!tier) {
        Sfx.error();
        msg.textContent = "등록되지 않은 코드입니다. 다시 확인해 주세요.";
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
        return;
      }
      input.disabled = true;
      picks.forEach((p) => (p.disabled = true));
      msg.classList.add("ok");
      msg.textContent = `확인 완료 — ${tier.prize}! 선물을 준비하고 있어요…`;
      Sfx.confirm();
      setTimeout(() => resolve({ tier, character, screen }), 1400);
    });
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 지지직 — 밝은 키오스크가 그 자리에서 깨지고 격리 구역으로 떨어지는 전환 (약 6초).
 *   ① 0.0s  선물 메시지가 한 글자씩 깨진다, 화면이 미세하게 떨린다
 *   ② 0.9s  화면이 찢긴다 — 가로 조각 어긋남·색 반전·RGB 번짐·노이즈, 배경이 붉게 물든다
 *   ③ 3.4s  툭 꺼짐(암전) — 정적 1초, 심장 박동
 *   ④ 4.4s  붉은 경보 — "격리 프로토콜 발동" 깜빡임, 경고 줄무늬, 사이렌
 * 혐오 이미지는 없다. 깨지는 화면·어둠·소리만으로 무섭게 한다.
 */
export async function playGlitch(app: HTMLElement, kiosk?: HTMLElement): Promise<void> {
  const g = el("div", "glitch-screen");
  g.dataset.testid = "glitch";
  const noise = el("div", "glitch-noise");
  const bars = el("div", "glitch-bars");
  const tear = el("div", "glitch-tear");
  const text = el("div", "glitch-text");
  g.append(tear, noise, bars, text);
  app.appendChild(g);
  const say = (s: string) => {
    text.textContent = s;
    text.dataset.text = s;
  };

  // ① 깨지기 시작
  kiosk?.classList.add("breaking-1");
  const msg = kiosk?.querySelector<HTMLElement>(".kiosk-msg");
  const original = msg?.textContent ?? "";
  const junk = "▓█░▒#%@$&";
  for (let i = 0; i < 6; i++) {
    if (msg) msg.textContent = [...original].map((c, k) => ((k * 7 + i * 3) % 5 === 0 ? junk[(k + i) % junk.length] : c)).join("");
    Sfx.glitch();
    await wait(150);
  }

  // ② 찢김
  kiosk?.classList.add("breaking-2");
  g.classList.add("phase-tear");
  const lines = ["선물 교▒환 완█료", "ERR 0x5EED — SYSTEM BREACH", "선물█ ▒선▓물 선░물", "접근 권한 없음", "격▓리 프로█토콜"];
  for (const s of lines) {
    say(s);
    Sfx.glitch();
    await wait(500);
  }

  // ③ 암전
  kiosk?.remove();
  g.className = "glitch-screen phase-black";
  say("");
  Sfx.heartbeat();
  await wait(500);
  Sfx.heartbeat();
  await wait(500);

  // ④ 붉은 경보
  g.className = "glitch-screen phase-alarm";
  say("격리 프로토콜 발동");
  const sub = el("div", "glitch-sub", "경고 · 도시 전역 감염 확산 · 외부 출입 차단");
  g.appendChild(sub);
  Sfx.alarm();
  await wait(700);
  Sfx.alarm();
  await wait(700);
  Sfx.thud();
  g.classList.add("fade-out");
  await wait(500);
  g.remove();
}

/**
 * STAGE 3 진입 — 칠흑에서 비상등이 몇 번 깜빡이다 켜진다. 게임 화면 위에 덮어 쓴다.
 * 끝나는 순간 쾅 소리와 화면 흔들림 — "무언가 이미 문 앞에 있다".
 */
export async function playEmergencyWake(app: HTMLElement): Promise<void> {
  const w = el("div", "qz-wake");
  w.dataset.testid = "qz-wake";
  app.appendChild(w);
  Sfx.alarm();
  await wait(2600);
  w.remove();
  Sfx.thud();
  setTimeout(() => Sfx.thud(), 260);
  app.classList.remove("qz-shake");
  void app.offsetWidth;
  app.classList.add("qz-shake");
  setTimeout(() => app.classList.remove("qz-shake"), 600);
  await wait(700);
}

/** STAGE 3 생존 화면 */
export async function showStage3Escape(app: HTMLElement, tier: GiftTier | null): Promise<void> {
  const screen = el("div", "stage-screen stage3-escape");
  screen.dataset.testid = "stage3-escape";
  screen.append(el("div", "stage-kicker", "STAGE 3 CLEAR · SURVIVED"), el("h1", "stage-title", "격리 구역 탈출 성공"));
  if (tier) {
    screen.append(el("p", "stage-text", "선물 교환 코드 확인"));
    const code = el("div", "gift-code", `${tier.code} → ${tier.prize}`);
    code.dataset.testid = "gift-result";
    screen.append(code);
  }
  screen.append(
    el("p", "stage-meta", `오답 ${sessionStats.fails}회 · 힌트 ${sessionStats.hintsUsed}회 · 플레이 ${playTime()}`),
    el("p", "stage-foot", "[Enter] 처음으로"),
  );
  app.appendChild(screen);
  Sfx.success();
  await waitKey(["Enter"]);
  location.href = `${location.pathname}?stage=2`;
}

/**
 * STAGE 3 GAME OUT — 쓰러진 뒤 암전 속에서 붉게 떠오른다.
 * [Enter]/화면 터치: 쓰러진 구역부터 다시 · [Esc]: 3-1부터 다시 (둘 다 글리치 없이 곧장)
 */
export async function showGameOut(app: HTMLElement, reason: string, zoneId: string): Promise<void> {
  const screen = el("div", "stage-screen game-out");
  screen.dataset.testid = "game-out";
  const title = el("h1", "game-out-title", "GAME OUT");
  title.dataset.text = "GAME OUT";
  const again = el("button", "game-out-btn", "[Enter] 이 구역부터 다시");
  again.dataset.testid = "game-out-retry";
  const restart = el("button", "game-out-btn ghost", "[Esc] 3-1부터 다시");
  const row = el("div", "game-out-row");
  row.append(again, restart);
  screen.append(
    el("div", "glitch-noise"),
    el("div", "stage-kicker", "SIGNAL LOST · 생존자 신호 소실"),
    title,
    el("p", "stage-text", reason),
    el("p", "stage-meta", `오답 ${sessionStats.fails}회 · 힌트 ${sessionStats.hintsUsed}회 · 플레이 ${playTime()}`),
    row,
  );
  app.appendChild(screen);
  Sfx.alarm();
  const go = (zone: string) => {
    location.href = `${location.pathname}?stage=3&zone=${zone}`;
  };
  await new Promise<void>((resolve) => {
    const on = (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.repeat) return;
      if (e.key === "Enter") go(zoneId);
      else if (e.key === "Escape") go("qz-1");
      else return;
      e.preventDefault();
      window.removeEventListener("keydown", on, true);
      resolve();
    };
    window.addEventListener("keydown", on, true);
    again.addEventListener("click", () => go(zoneId));
    restart.addEventListener("click", () => go("qz-1"));
  });
}

/** 구역 진입 타이틀 카드 — 암전 속에 "STAGE 3-2 · 세포와 물질대사 구역"이 깜빡이며 떠오른다 */
export async function playZoneCard(app: HTMLElement, label: string, name: string): Promise<void> {
  const card = el("div", "zone-card");
  card.dataset.testid = "zone-card";
  const t = el("div", "zone-card-label", label);
  t.dataset.text = label;
  card.append(el("div", "glitch-noise"), t, el("div", "zone-card-name", name));
  app.appendChild(card);
  Sfx.alarm();
  await new Promise((r) => setTimeout(r, 2200));
  card.classList.add("out");
  await new Promise((r) => setTimeout(r, 500));
  card.remove();
}
