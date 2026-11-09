/**
 * 퀴즈 단계 → 정답 클릭 순서(testid 목록). e2e가 이걸 import해 퍼즐을 푼다 —
 * **정답을 spec에 다시 적지 않는다.** 정답의 단일 소스는 각 퍼즐의 steps.ts다.
 * (CSS·DOM을 import하지 않는 순수 모듈이라 Node(Playwright)에서도 읽힌다)
 */
import type { QuizStep } from "./types";

export function solutionClicks(steps: QuizStep[]): string[][] {
  return steps.map((s) => {
    switch (s.kind) {
      case "choice":
        return [`lq-opt-${s.answer}`];
      case "match":
        return s.answer.map((i) => `lq-opt-${i}`);
      case "order":
        return s.items.map((_, k) => `lq-item-${k}`);
      case "sequence":
        return [...s.answer].map((c) => `lq-key-${c}`);
    }
  });
}

/** 단계 데이터 자체의 결함 검산 — 정답 인덱스가 범위 안인가, 순서 문항의 표시 순서가 순열인가 */
export function validateSteps(steps: QuizStep[]): string[] {
  const errs: string[] = [];
  steps.forEach((s, k) => {
    if (s.kind === "choice" && (s.answer < 0 || s.answer >= s.options.length)) errs.push(`${k}: choice answer 범위 밖`);
    if (s.kind === "match") {
      if (s.answer.length !== s.left.length) errs.push(`${k}: match 정답 수 ≠ 항목 수`);
      if (new Set(s.answer).size !== s.answer.length) errs.push(`${k}: match 정답 중복`);
    }
    if (s.kind === "order" && [...s.display].sort().join() !== s.items.map((_, i) => i).join())
      errs.push(`${k}: order display가 순열이 아님`);
    if (s.kind === "order" && s.display.every((v, i) => v === i)) errs.push(`${k}: order가 이미 정답 순서로 보인다`);
    if (s.kind === "sequence" && (s.answer.length !== s.template.length || [...s.answer].some((c) => !s.alphabet.includes(c))))
      errs.push(`${k}: sequence 정답 길이·글자 불일치`);
  });
  return errs;
}
