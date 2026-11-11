/**
 * STAGE 1 — 「GS BIOLAB」: 좀비 아포칼립스 전, 평화로운 도시의 생명과학 연구소.
 * 부스 손님을 안심시키는 '밝은' 방이다 — 문제는 고1 통합과학1·2의 생명 영역에서만 낸다.
 *
 * 배경은 scripts/draw-lab.mjs가 코드로 그린 room-lab.png (N=12, 절반 해상도 ×2).
 *   왼벽(x=-0.5)  y 1.6~7.4  발광 생물학 모식도 스크린  → 수색 지점
 *   왼벽(x=-0.5)  y 8.4~11.2 GS BIOLAB 로고 간판 + 실험대
 *   오른벽(y=-0.5) x 1.4~8.0  대형 강화 유리 관찰창      → 수색 지점
 *   오른벽(y=-0.5) x 9.2~11.0 EXIT-LOCKED 격리 철문     → 보안코드 문
 *   냉장고 x 8.3~9.0 · 화분 2 → blocks
 * 그림의 좌표가 곧 이 파일의 좌표다 — 배경을 다시 그리면 여기 숫자도 함께 본다.
 *
 * 퍼즐 3개가 보안코드 세 자리(4·2·3)를 하나씩 내준다. 출구에서 E → 화면 상단 입력줄.
 */
import type { GameMap } from "./types";

export const labRoom: GameMap = {
  id: "lab-room",
  cols: 12,
  rows: 12,
  spawn: [5.5, 9.5],
  // node scripts/draw-lab.mjs 출력값 (코드로 그린 그림이라 실측 없이 정확하다)
  background: { sprite: "room-lab", scale: 2, offsetX: -1692, offsetY: -534, frame: { x: -800, y: -474, w: 1600, h: 1230 } },
  codeSlots: 3,
  voidColor: "lab-wall-shade",
  blocks: [
    { x0: -1, y0: -1, x1: 0.5, y1: 13 }, // 왼벽 띠
    { x0: -1, y0: -1, x1: 13, y1: 0.5 }, // 오른벽 띠
    { x0: -1, y0: 8.2, x1: 0.95, y1: 11.4 }, // 실험대
    { x0: 8.1, y0: -1, x1: 9.2, y1: 0.65 }, // 검체 냉장고
    { x0: -1, y0: -1, x1: 0.9, y1: 0.9 }, // 화분 (북쪽 구석)
    { x0: 10.8, y0: -1, x1: 13, y1: 1.0 }, // 화분 (문 옆)
    { x0: 2.1, y0: 5.4, x1: 3.9, y1: 6.6 }, // 현미경 스테이션
    { x0: 6.95, y0: 2.45, x1: 8.05, y1: 3.55 }, // DNA 분석기
    { x0: 6.3, y0: 7.45, x1: 7.7, y1: 8.55 }, // 생태 수조
  ],
  objects: [
    {
      id: "cell-scope",
      name: "현미경 스테이션",
      sprite: "dev-microscope",
      tile: [3, 6],
      range: 1.7,
      grounded: true,
      sink: 25.6,
      puzzleId: "cell-scope",
      clue: { slot: 1, digit: "4" },
      solvedAnchor: "#cell-scope-done",
    },
    {
      id: "gene-flow",
      name: "DNA 분석기",
      sprite: "dev-sequencer",
      tile: [7.5, 3],
      range: 1.6,
      grounded: true,
      sink: 16,
      puzzleId: "gene-flow",
      clue: { slot: 2, digit: "2" },
      solvedAnchor: "#gene-flow-done",
    },
    {
      id: "eco-tank",
      name: "생태 수조",
      sprite: "dev-ecotank",
      tile: [7, 8],
      range: 1.7,
      grounded: true,
      sink: 19.2,
      puzzleId: "eco-tank",
      clue: { slot: 3, digit: "3" },
      solvedAnchor: "#eco-tank-done",
    },
    // 벽 그림 자체가 조사 지점 (스프라이트 없음)
    { id: "lab-screen", name: "생물학 모식도 스크린", tile: [0.6, 4.5], range: 1.5, search: { anchor: "#search-lab-screen" } },
    { id: "lab-window", name: "관찰창", tile: [4.7, 0.6], range: 1.6, search: { anchor: "#search-lab-window" } },
    {
      id: "exit-door",
      name: "EXIT — 격리 철문",
      tile: [10.1, 0.7],
      range: 1.3,
      interactAnchor: "#lab-door-locked",
      codeLock: { code: "423", event: "door:lab-open" },
      door: { requiresEvent: "door:lab-open", emit: "stage1:escaped" },
    },
  ],
};
