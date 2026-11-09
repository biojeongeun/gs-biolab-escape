/** 신경 신호 중계기 — 활동전위 복구 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const nerveRelay: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "dark",
      device: "NEURO-RELAY · SIGNAL LINE 1",
      steps: STEPS,
      testId: "quiz-nerve-relay",
    }),
};
