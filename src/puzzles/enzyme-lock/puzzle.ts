/** 효소 반응 제어기 — 억제제 분석 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const enzymeLock: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "dark",
      device: "ENZYME CONTROL · INHIBITOR LAB",
      steps: STEPS,
      testId: "quiz-enzyme-lock",
    }),
};
