import type { GameMap } from "./types";
import { labRoom } from "./lab-room";
import { qz1, qz2, qz3, qzHidden } from "./quarantine-room";

export const maps: Record<string, GameMap> = {
  [labRoom.id]: labRoom,
  [qz1.id]: qz1,
  [qz2.id]: qz2,
  [qz3.id]: qz3,
  [qzHidden.id]: qzHidden,
};

/** 프롤로그 다음에 들어서는 첫 방 (STAGE 1). STAGE 3은 main.ts가 ?stage=2 흐름에서 직접 연다. */
export const FIRST_ROOM = labRoom;

/** STAGE 3 시작 방 — 선물 코드 화면(STAGE 2) 뒤에 열린다 */
export const STAGE3_ROOM = qz1;

/**
 * 방 사슬 — `__qe.warp`(?grid 디버그)가 사용한다.
 * STAGE 1 출구는 'stage1:escaped'를 발화하고 main.ts가 선물 코드 안내 → STAGE 2 → STAGE 3으로
 * 화면을 넘긴다. STAGE 3 안의 구역(3-1 → 3-2 → 3-3)은 철문(door.toMap)으로 이어진다.
 */
export const ROOM_CHAIN: { id: string; unlockEvent: string }[] = [
  { id: labRoom.id, unlockEvent: "door:lab-open" },
  { id: qz1.id, unlockEvent: "door:qz-1-open" },
  { id: qz2.id, unlockEvent: "door:qz-2-open" },
  { id: qz3.id, unlockEvent: "door:qz-3-open" },
  { id: qzHidden.id, unlockEvent: "door:qz-hidden-open" },
];
