/** 격리 유전 분석기 — 생존자 가계도 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const pedigreeLock: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "dark",
      device: "GENETIC ANALYZER · FAMILY 2-B",
      steps: STEPS,
      testId: "quiz-pedigree-lock",
    }),
};
