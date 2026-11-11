/**
 * 게임 정체성 — **새 교과로 갈아탈 때 가장 먼저 고치는 파일.**
 * 세계관 문자열이 엔진과 main에 흩어져 있으면 교사가 engine/을 열어야 한다.
 * 여기 없는 것은 `index.html`의 <title>·og 메타뿐이다 (빌드 전 정적 HTML이라 못 닿는다).
 */

/** 타이틀 화면 — 작은 시리즈명 + 큰 한글 부제 */
export const TITLE_SUB = "BIO ESCAPE · STAGE 1";
export const TITLE_MAIN = "GS BIOLAB 견학";

/** 시작 버튼 (저장된 진행이 있으면 '처음부터'가 대신 나온다) */
export const START_LABEL = "견학 시작";

/** 캐릭터 선택 화면 안내문 */
export const CHAR_SELECT_LABEL = "견학생을 선택하세요";
/** STAGE 3 캐릭터 선택 안내문 */
export const CHAR_SELECT_LABEL_STAGE3 = "생존자를 선택하라";

/** 타이틀 하단 제작자 표기 — 킷 원작자 표기. 부스 이름으로 바꿔도 된다. */
export const CREDIT = "made with escape-kit by 청학고 도쌤";

/** 제작자 표기를 눌렀을 때 열리는 주소. 킷을 받아 쓰는 사람은 자기 주소로 바꾼다. */
export const CREDIT_URL = "https://dossamlink.vercel.app";

/** 문의하기 — 메일 폴백 주소와 분류. 두 번째 항목이 교과 질문 자리다. */
export const CONTACT_EMAIL = "dossamlab@gmail.com";
export const CONTACT_CATEGORIES = [
  "새로운 방 아이디어 제안",
  "버그 제보",
  "생명과학 개념 질문",
  "기타 의견",
] as const;

/** 엔딩 화면 (엔진 기본 엔딩 — 이 게임은 스테이지별 화면을 main.ts에서 직접 띄운다) */
export const ENDING_SUB = TITLE_SUB;
export const ENDING_MAIN = "격리 구역 탈출";
export const ENDING_NOTES_COMPLETE = "모든 기록을 읽었다.";
export const ENDING_NOTES_INCOMPLETE = "…아직 읽지 않은 기록이 남아 있다.";

/**
 * localStorage 저장 키. **다른 게임과 반드시 다르게 둘 것** —
 * 같은 키를 쓰면 브라우저에 남은 남의 진행 상황을 읽어 이상하게 재개된다.
 */
export const SAVE_KEY = "gs-biolab-escape:festival:v1";

/**
 * 축제 부스용: '이어하기'를 끈다. 손님마다 처음부터 시작해야 하므로
 * 타이틀에는 시작 버튼만 나오고, 시작할 때마다 진행이 초기화된다.
 */
export const ALLOW_CONTINUE = false;

// ───────────── 선물 교환 코드 (STAGE 1 → STAGE 2) ─────────────

/**
 * STAGE 1을 탈출하면 오답 수에 따라 코드 하나를 준다. 생물실(STAGE 2)에서 이 코드를 넣는다.
 * 부스 운영진이 선물 이름(prize)과 코드를 자유롭게 바꾼다. 코드는 영문·숫자·하이픈.
 * maxFails 오름차순으로 적는다 — 위에서부터 처음 맞는 줄이 선택된다.
 */
export const GIFT_TIERS = [
  { maxFails: 1, code: "CELL-GOLD", prize: "1등 선물" },
  { maxFails: 4, code: "CELL-SILVER", prize: "2등 선물" },
  { maxFails: Infinity, code: "CELL-GREEN", prize: "참가 선물" },
] as const;

/** STAGE 2 키오스크 문구 */
export const GIFT_KIOSK_TITLE = "선물 교환 키오스크";
export const GIFT_KIOSK_HELP = "STAGE 1 탈출 화면에서 받은 선물 교환 코드를 입력하세요";

// ───────────── STAGE 3 생존 수치 ─────────────

/**
 * 좀비와의 거리(m) — 시작값, 초당 접근 속도(구역 배율 ZONE_ZOMBIE_SPEEDUP을 곱한다), 오답 1회당 접근.
 * 수치는 3-1부터 히든까지 한 번도 되돌아가지 않는다 — 장치를 풀어도 회복 없음.
 * 구역마다 약 4분이면: 3-1~3-3에 약 75m, 히든에 약 36m를 쓴다 → 오답 몇 번의 여유.
 */
export const ZOMBIE_START_M = 150;
export const ZOMBIE_SPEED_MPS = 0.08;
export const ZOMBIE_WRONG_M = 8;

/** 잔여 산소(%) — 초당 감소. 회복 없음 (약 19분이면 바닥) */
export const O2_DRAIN_PER_S = 0.085;

/** ATP — 시작값·최대, 이동 중 초당 소모, 정지 중 초당 회복, 고갈 시 이동 속도 배율 */
export const ATP_START = 30;
export const ATP_MAX = 60;
export const ATP_MOVE_COST_PER_S = 1.0;
export const ATP_REST_GAIN_PER_S = 0.6;
export const ATP_EMPTY_SPEED = 0.45;

// ───────────── STAGE 3 세부 구역 (3-1 → 3-2 → 3-3 → 히든) ─────────────

/** 구역별 좀비 접근 속도 배율 — 깊이 들어갈수록 빨라진다 */
export const ZONE_ZOMBIE_SPEEDUP: Record<string, number> = {
  "qz-1": 1,
  "qz-2": 1.3,
  "qz-3": 1.6,
  "qz-hidden": 1.9,
};
/** 3-3까지 오답(퍼즐+보안코드)이 이 횟수 이하이면 히든 스테이지가 열린다 */
export const HIDDEN_MAX_FAILS = 5;

/** 좀비가 다가오며 화면이 흔들리는 주기(초) */
export const QUAKE_EVERY_S = 40;
/** 손전등을 끄면 좀비 접근 속도 배율 (빛을 쫓는다) */
export const FLASHLIGHT_OFF_ZOMBIE = 0.7;
/** 화면이 어두워지기 시작하는 위험선 — 좀비 거리(m)·산소(%)·ATP */
export const FADE_ZOMBIE_M = 45;
export const FADE_O2 = 35;
export const FADE_ATP = 10;
/** 유리 금이 한 단계씩 늘어나는 좀비 거리(m) */
export const CRACK_STEPS_M = [90, 65, 45, 28, 14];

/** 전체화면 — 첫 클릭·키 입력 때 전체화면으로 들어간다 (브라우저는 사용자 입력 없이 허용하지 않는다) */
export const FULLSCREEN = true;
