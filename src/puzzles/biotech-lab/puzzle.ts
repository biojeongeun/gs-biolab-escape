/** 생명공학 실험대 — 치료제 후보 증폭 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const biotechLab: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "dark",
      device: "BIOTECH BENCH · PCR / CRISPR",
      steps: STEPS,
      testId: "quiz-biotech-lab",
    }),
};
