/** 면역 분석 단말 — 방어 작용 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const immuneScan: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "dark",
      device: "IMMUNE ANALYZER · BLOOD BANK",
      steps: STEPS,
      testId: "quiz-immune-scan",
    }),
};
