/** 혈당 조절 장치 — 이자 호르몬 — 문항은 steps.ts, 정답 클릭 순서는 autoplay.ts */
import type { PuzzleModule } from "../../engine/puzzle-host/types";
import manifest from "./manifest.json";
import { mountQuiz } from "../_shared/lab-quiz";
import { STEPS } from "./steps";
import "./puzzle.css";

export const glucoseCtrl: PuzzleModule = {
  manifest,
  mount: (api) =>
    mountQuiz(api, {
      theme: "dark",
      device: "GLUCOSE CONTROL · PANCREAS UNIT",
      steps: STEPS,
      testId: "quiz-glucose-ctrl",
    }),
};
