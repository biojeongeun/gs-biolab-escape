/** 뉴스 아카이브 ② — 2025 노벨 생리의학상 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const newsTreg: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "dark",
      device: "NEWS ARCHIVE · 2025-10-06",
      steps: STEPS,
      testId: "quiz-news-treg",
    }),
};
