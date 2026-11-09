/** 비상 발전기 — 마이토콘드리아 회로 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const mitoReactor: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "dark",
      device: "MITO-REACTOR · EMERGENCY POWER",
      steps: STEPS,
      testId: "quiz-mito-reactor",
    }),
};
