/** 유전정보 해독기 — 복제와 번역 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const dnaReplicator: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "dark",
      device: "GENE DECODER · RIBOSOME LINE",
      steps: STEPS,
      testId: "quiz-dna-replicator",
    }),
};
