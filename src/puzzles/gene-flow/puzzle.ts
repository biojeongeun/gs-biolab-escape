/** DNA 분석기 — 유전정보 해독 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const geneFlow: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "lab",
      device: "DNA SEQUENCER · SAMPLE 03",
      steps: STEPS,
      testId: "quiz-gene-flow",
    }),
};
