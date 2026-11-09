/**
 * 인벤토리 아이템 정의 — 수색이나 퍼즐 보상으로 얻는 단서.
 * 콘텐츠이므로 engine/ 밖에 둔다 (엔진은 이 목록을 모른다).
 *
 * 지급 경로 둘: 맵의 `search: { itemId }` 또는 퍼즐 manifest의 `reward.itemId`.
 * 소비 경로 하나: 퍼즐 manifest의 `gate.items`.
 * (생명과학 방탈출 1판에는 아이템이 없다 — 보안코드 숫자가 단서 역할을 한다)
 */

export interface ItemDef {
  id: string;
  name: string;
  /** 이모지 플레이스홀더 (전용 아이콘 에셋 없을 때) */
  emoji: string;
  /** 재열람 시 보여줄 발견 앵커 (수색 앵커와 동일) */
  anchor: string;
}

export const ITEMS: Record<string, ItemDef> = {};
