/** 뉴스 아카이브 ③ — 세계 첫 맞춤형 유전자 편집 치료 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const newsBaseedit: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "dark",
      device: "NEWS ARCHIVE · 2025-05-15",
      steps: STEPS,
      testId: "quiz-news-baseedit",
    }),
};
