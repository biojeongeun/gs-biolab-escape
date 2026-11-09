/**
 * STAGE 3 — 「아포칼립스 도시 생물연구소 격리 구역」: 세부 구역 3개 + 히든.
 *   3-1 생명 현상 연구팀 → 3-2 생명 에너지 연구팀 → 3-3 유전자 분석 연구팀 → (조건부) 히든: 최신 뉴스
 * 구역마다 장치 3대가 보안코드 세 자리를 하나씩 내주고, 철문을 열면 다음 구역으로 간다.
 * 좀비 거리·산소·ATP는 구역을 넘어가도 그대로 이어진다.
 *
 * 배경: scripts/draw-lab.mjs가 구역마다 따로 그린다 (기하는 lab-room과 같다 — 벽·충돌 자리 공통).
 *   3-1 room-qz-1 붉은 등·침대·신경세포 스크린 · 3-2 room-qz-2 호박색 등·배관·식물 재배대
 *   3-3 room-qz-3 보랏빛 등·서버랙·DNA 스크린 · 히든 room-quarantine
 * 장치 자리(A·B·C)는 네 구역이 같다 — 충돌 박스가 스프라이트에 맞춰져 있기 때문.
 *   A [3,6] dev-mito · B [7.5,3] dev-pedigree · C [7,8] dev-immune
 * 혐오 표현 금지 원칙: 피·시체·괴물 그림 없음. 공포는 어둠·소리·창밖 그림자로만.
 * 좀비 거리·산소·ATP HUD는 src/stage/quarantine.ts가 맡는다(엔진 밖).
 */
import type { GameMap, MapObject } from "./types";

interface Device {
  puzzleId: string;
  name: string;
  digit: string;
}

interface ZoneSpec {
  id: string;
  /** A·B·C 자리에 놓을 장치 (= 보안코드 1·2·3번 자리) */
  devices: [Device, Device, Device];
  code: string;
  /** 철문을 연 뒤: 다음 구역으로 이동하거나, 이벤트를 내보내 main.ts가 정하게 한다 */
  next: { toMap: string } | { emit: string };
  /** 배경 그림 — scripts/draw-lab.mjs가 구역 특색대로 그린 room-<id>.png */
  background: string;
}

const SLOT = [
  { sprite: "dev-mito", tile: [3, 6] as [number, number], range: 1.7, sink: 22.4 },
  { sprite: "dev-pedigree", tile: [7.5, 3] as [number, number], range: 1.6, sink: 20.8 },
  { sprite: "dev-immune", tile: [7, 8] as [number, number], range: 1.6, sink: 16 },
];

const SPAWN: [number, number] = [5.5, 9.5];

function zone(z: ZoneSpec): GameMap {
  const devices: MapObject[] = z.devices.map((d, i) => ({
    id: d.puzzleId,
    name: d.name,
    sprite: SLOT[i].sprite,
    tile: SLOT[i].tile,
    range: SLOT[i].range,
    grounded: true,
    sink: SLOT[i].sink,
    puzzleId: d.puzzleId,
    clue: { slot: i + 1, digit: d.digit },
    solvedAnchor: `#${d.puzzleId}-done`,
  }));
  const openEvent = `door:${z.id}-open`;
  return {
    id: z.id,
    cols: 12,
    rows: 12,
    spawn: SPAWN,
    background: { sprite: z.background, scale: 2, offsetX: -860, offsetY: -534 },
    codeSlots: 3,
    blocks: [
      { x0: -1, y0: -1, x1: 0.5, y1: 13 },
      { x0: -1, y0: -1, x1: 13, y1: 0.5 },
      { x0: -1, y0: 8.2, x1: 0.95, y1: 11.4 }, // 무너진 실험대
      { x0: 0.6, y0: 9.9, x1: 1.7, y1: 11.1 }, // 넘어진 상자
      { x0: 8.1, y0: -1, x1: 9.2, y1: 0.65 }, // 바리케이드
      { x0: 2.25, y0: 5.25, x1: 3.75, y1: 6.75 }, // 자리 A
      { x0: 6.75, y0: 2.5, x1: 8.25, y1: 3.5 }, // 자리 B
      { x0: 6.45, y0: 7.45, x1: 7.55, y1: 8.55 }, // 자리 C
    ],
    objects: [
      ...devices,
      { id: `${z.id}-screen`, name: "깜빡이는 모식도 스크린", tile: [0.6, 4.5], range: 1.5, search: { anchor: `#search-${z.id}-screen` } },
      { id: `${z.id}-window`, name: "금 간 관찰창", tile: [4.7, 0.6], range: 1.6, search: { anchor: `#search-${z.id}-window` } },
      {
        id: `${z.id}-door`,
        name: "EXIT-LOCKED 격리 철문",
        tile: [10.1, 0.7],
        range: 1.3,
        interactAnchor: "#qz-door-locked",
        codeLock: { code: z.code, event: openEvent },
        door:
          "toMap" in z.next
            ? { requiresEvent: openEvent, toMap: z.next.toMap, spawn: SPAWN }
            : { requiresEvent: openEvent, emit: z.next.emit },
      },
    ],
  };
}

/** 3-1 생명과학 구역 — 보안코드 521 */
export const qz1 = zone({
  id: "qz-1",
  devices: [
    { puzzleId: "nerve-relay", name: "신경 신호 중계기", digit: "5" },
    { puzzleId: "glucose-ctrl", name: "혈당 조절 장치", digit: "2" },
    { puzzleId: "immune-scan", name: "면역 분석 단말", digit: "1" },
  ],
  code: "521",
  background: "room-qz-1",
  next: { toMap: "qz-2" },
});

/** 3-2 세포와 물질대사 구역 — 보안코드 302 */
export const qz2 = zone({
  id: "qz-2",
  devices: [
    { puzzleId: "mito-reactor", name: "비상 발전기", digit: "3" },
    { puzzleId: "enzyme-lock", name: "효소 반응 제어기", digit: "0" },
    { puzzleId: "photo-panel", name: "광합성 패널", digit: "2" },
  ],
  code: "302",
  background: "room-qz-2",
  next: { toMap: "qz-3" },
});

/** 3-3 생물의 유전 구역 — 보안코드 482. 문을 열면 main.ts가 히든 진입 여부를 정한다 */
export const qz3 = zone({
  id: "qz-3",
  devices: [
    { puzzleId: "dna-replicator", name: "유전정보 해독기", digit: "4" },
    { puzzleId: "pedigree-lock", name: "격리 유전 분석기", digit: "8" },
    { puzzleId: "biotech-lab", name: "생명공학 실험대", digit: "2" },
  ],
  code: "482",
  background: "room-qz-3",
  next: { emit: "stage3:zone3-cleared" },
});

/** 히든 — 최신 생명과학 뉴스 아카이브. 보안코드 321 */
export const qzHidden = zone({
  id: "qz-hidden",
  devices: [
    { puzzleId: "news-opto", name: "뉴스 아카이브 ① 2026", digit: "3" },
    { puzzleId: "news-treg", name: "뉴스 아카이브 ② 2025", digit: "2" },
    { puzzleId: "news-baseedit", name: "뉴스 아카이브 ③ 2025", digit: "1" },
  ],
  code: "321",
  background: "room-quarantine",
  next: { emit: "stage3:escaped" },
});

/** 구역 순서와 화면에 띄울 이름 — 진입 타이틀 카드·재도전 주소가 쓴다 */
export const QZ_ZONES = [
  { id: qz1.id, label: "STAGE 3-1", name: "생명 현상 연구팀 구역" },
  { id: qz2.id, label: "STAGE 3-2", name: "생명 에너지 연구팀 구역" },
  { id: qz3.id, label: "STAGE 3-3", name: "유전자 분석 연구팀 구역" },
  { id: qzHidden.id, label: "HIDDEN STAGE", name: "최신 생명과학 뉴스 아카이브" },
] as const;
