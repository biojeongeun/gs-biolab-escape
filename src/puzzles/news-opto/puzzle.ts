/** 뉴스 아카이브 ① — 2026 노벨 생리의학상 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const newsOpto: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "dark",
      device: "NEWS ARCHIVE · 2026-10-05",
      steps: STEPS,
      testId: "quiz-news-opto",
    }),
};
