/** 광합성 패널 — 엽록체 회로 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const photoPanel: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "dark",
      device: "PHOTO PANEL · CHLOROPLAST LINE",
      steps: STEPS,
      testId: "quiz-photo-panel",
    }),
};
