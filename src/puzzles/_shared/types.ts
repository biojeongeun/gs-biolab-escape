/** 퀴즈 단계 타입 — DOM 없는 순수 모듈 (steps.ts·autoplay.ts·e2e 공용) */
export type QuizStep =
  | { kind: "choice"; prompt: string; figure?: string; options: string[]; answer: number }
  | { kind: "match"; prompt: string; figure?: string; left: string[]; options: string[]; answer: number[] }
  | { kind: "order"; prompt: string; figure?: string; items: string[]; display: number[] }
  | { kind: "sequence"; prompt: string; figure?: string; template: string[]; alphabet: string[]; answer: string };
