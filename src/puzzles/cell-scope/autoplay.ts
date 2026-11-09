/** e2e용 정답 — steps.ts에서 파생 (정답을 spec에 다시 적지 않는다) */
import { solutionClicks } from "../_shared/autoplay";
import { STEPS, DIGIT } from "./steps";

export const SOLUTION = solutionClicks(STEPS);
/** 이 장치가 내주는 보안코드 숫자와 자리 */
export const CLUE = { slot: 1, digit: DIGIT };
