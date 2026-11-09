/** 현미경 스테이션 — 세포소기관 판독 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const cellScope: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "lab",
      device: "MICROSCOPE STATION · SLIDE 07",
      steps: STEPS,
      testId: "quiz-cell-scope",
    }),
};
