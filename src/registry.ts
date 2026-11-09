/**
 * 퍼즐 등록부. add-puzzle 절차(puzzle-builder)가 여기 등록한다.
 * 여기 없는 퍼즐은 로드되지 않는다 — 맵의 `puzzleId`가 만족되지 않으면
 * 그 오브젝트는 `interactAnchor` 대사만 띄운다.
 */
import type { PuzzleModule } from "./engine/puzzle-host/types";
import { cellScope } from "./puzzles/cell-scope/puzzle";
import { geneFlow } from "./puzzles/gene-flow/puzzle";
import { ecoTank } from "./puzzles/eco-tank/puzzle";
import { nerveRelay } from "./puzzles/nerve-relay/puzzle";
import { glucoseCtrl } from "./puzzles/glucose-ctrl/puzzle";
import { immuneScan } from "./puzzles/immune-scan/puzzle";
import { mitoReactor } from "./puzzles/mito-reactor/puzzle";
import { enzymeLock } from "./puzzles/enzyme-lock/puzzle";
import { photoPanel } from "./puzzles/photo-panel/puzzle";
import { dnaReplicator } from "./puzzles/dna-replicator/puzzle";
import { pedigreeLock } from "./puzzles/pedigree-lock/puzzle";
import { biotechLab } from "./puzzles/biotech-lab/puzzle";
import { newsOpto } from "./puzzles/news-opto/puzzle";
import { newsTreg } from "./puzzles/news-treg/puzzle";
import { newsBaseedit } from "./puzzles/news-baseedit/puzzle";

// 배열 순서 = 저널의 원리 카드 나열 순서 = 보안코드 자리 순서.
export const puzzles: PuzzleModule[] = [
  // STAGE 1 — GS BIOLAB (통합과학1·2 생명 영역, 보안코드 4·2·3)
  cellScope,
  geneFlow,
  ecoTank,
  // STAGE 3-1 — 생명과학 구역 (보안코드 5·2·1)
  nerveRelay,
  glucoseCtrl,
  immuneScan,
  // STAGE 3-2 — 세포와 물질대사 구역 (보안코드 3·0·2)
  mitoReactor,
  enzymeLock,
  photoPanel,
  // STAGE 3-3 — 생물의 유전 구역 (보안코드 4·8·2)
  dnaReplicator,
  pedigreeLock,
  biotechLab,
  // HIDDEN — 최신 생명과학 뉴스 (보안코드 3·2·1)
  newsOpto,
  newsTreg,
  newsBaseedit,
];

export function findPuzzle(id: string): PuzzleModule | undefined {
  return puzzles.find((p) => p.manifest.id === id);
}
